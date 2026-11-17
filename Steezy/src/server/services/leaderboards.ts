/**
 * Monthly wager leaderboards.
 *
 * A live board's standings are computed from the daily wager snapshots on
 * every read; freezing writes them to `leaderboard_results` so the final
 * placings (and who gets paid) never move afterwards.
 *
 * Names: every player is shown masked (`Ma**ins`: first two letters, `**`, last three)
 * whether or not they linked an account here. Members still see their own
 * place through "your rank".
 */
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { leaderboardResults, leaderboards, roobetDailyWager } from '@/server/db/schema';
import { maskName } from '@/lib/format';
import { dayKey, wagerTotals, type Metric } from './wagers';
import { audit } from './audit';
import { boostBonusFor } from './wager-boosts';

export type Leaderboard = typeof leaderboards.$inferSelect;

export type Standing = {
  rank: number;
  roobetUid: string;
  userId: string | null;
  displayName: string;
  wagered: number;
  prize: number;
  paidAt: Date | null;
  /** Highest double-points multiplier this player wagered under in the board (the "2×" badge), else null. */
  boost: number | null;
};

export async function getLeaderboard(id: string) {
  const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, id)).limit(1);
  return board ?? null;
}

/** The board to show on /leaderboard: the running one, else the most recently ended one. */
export async function currentLeaderboard(now = new Date()) {
  const [running] = await db
    .select()
    .from(leaderboards)
    .where(and(eq(leaderboards.status, 'live'), lte(leaderboards.startsAt, now)))
    .orderBy(desc(leaderboards.startsAt))
    .limit(1);
  if (running) return running;
  const [last] = await db
    .select()
    .from(leaderboards)
    .where(inArray(leaderboards.status, ['frozen', 'published']))
    .orderBy(desc(leaderboards.endsAt))
    .limit(1);
  return last ?? null;
}

export async function listLeaderboards() {
  return db.select().from(leaderboards).orderBy(desc(leaderboards.startsAt));
}

/** Everyone's wager in the board's window, both ways, and how many players it took. */
export async function boardTotals(board: Leaderboard) {
  const [row] = await db
    .select({
      weighted: sql<number>`coalesce(sum(${roobetDailyWager.weightedWagered}), 0)::float8`,
      wagered: sql<number>`coalesce(sum(${roobetDailyWager.wagered}), 0)::float8`,
      players: sql<number>`count(distinct ${roobetDailyWager.roobetUid}) filter (where ${roobetDailyWager.wagered} > 0)::int`,
    })
    .from(roobetDailyWager)
    .where(and(gte(roobetDailyWager.day, dayKey(board.startsAt)), lte(roobetDailyWager.day, dayKey(board.endsAt))));
  return row;
}

/**
 * Live standings computed from wagers, plus the extra from any double-points
 * windows in the board. Blocked members and players under the minimum are left out.
 */
export async function computeStandings(board: Leaderboard): Promise<Standing[]> {
  const [base, bonus] = await Promise.all([
    wagerTotals(board.startsAt, board.endsAt, board.metric as Metric),
    boostBonusFor(board.startsAt, board.endsAt, board.metric as Metric),
  ]);
  const totals = bonus.size
    ? base.map((t) => ({ ...t, total: t.total + (bonus.get(t.roobetUid)?.bonus ?? 0) })).sort((a, b) => b.total - a.total)
    : base;
  return totals
    .filter((t) => t.total > 0 && t.total >= board.minWager && !t.blocked)
    .map((t, i) => {
      return {
        rank: i + 1,
        roobetUid: t.roobetUid,
        userId: t.userId,
        displayName: maskName(t.roobetUsername),
        wagered: t.total,
        prize: board.prizes[i] ?? 0,
        paidAt: null,
        boost: bonus.get(t.roobetUid)?.multiplier ?? null,
      };
    });
}

export async function getStandings(board: Leaderboard): Promise<Standing[]> {
  if (board.status === 'frozen' || board.status === 'published') {
    const [rows, bonus] = await Promise.all([
      db.select().from(leaderboardResults).where(eq(leaderboardResults.leaderboardId, board.id)).orderBy(asc(leaderboardResults.rank)),
      boostBonusFor(board.startsAt, board.endsAt, board.metric as Metric),
    ]);
    return rows.map((r) => ({
      rank: r.rank,
      roobetUid: r.roobetUid,
      userId: r.userId,
      displayName: r.displayName,
      wagered: r.wagered,
      prize: r.prize,
      paidAt: r.paidAt,
      boost: bonus.get(r.roobetUid)?.multiplier ?? null,
    }));
  }
  return computeStandings(board);
}

/** Lock in the final standings. Idempotent: a frozen board keeps its first results. */
export async function freezeLeaderboard(id: string, actorId: string | null) {
  const board = await getLeaderboard(id);
  if (!board || board.status === 'frozen' || board.status === 'published') return board;

  const standings = await computeStandings(board);
  await db.transaction(async (tx) => {
    await tx.delete(leaderboardResults).where(eq(leaderboardResults.leaderboardId, id));
    if (standings.length) {
      await tx.insert(leaderboardResults).values(
        standings.map((s) => ({
          leaderboardId: id,
          rank: s.rank,
          roobetUid: s.roobetUid,
          userId: s.userId,
          displayName: s.displayName,
          wagered: s.wagered,
          prize: s.prize,
        })),
      );
    }
    await tx.update(leaderboards).set({ status: 'frozen' }).where(eq(leaderboards.id, id));
  });
  await audit(actorId, 'leaderboard.freeze', 'leaderboard', id, null, { entries: standings.length });
  return { ...board, status: 'frozen' };
}

/** Called by the background job: freeze every live board whose window has ended. */
export async function freezeEndedLeaderboards(now = new Date()) {
  const ended = await db
    .select({ id: leaderboards.id })
    .from(leaderboards)
    .where(and(eq(leaderboards.status, 'live'), lte(leaderboards.endsAt, now)));
  for (const b of ended) await freezeLeaderboard(b.id, null);
  return ended.length;
}
