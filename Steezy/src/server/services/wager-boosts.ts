/**
 * Double points (wager boosts).
 *
 * While a boost runs, every wager under the code counts `multiplier` times on
 * the leaderboard. Roobet's stats API takes any start/end instant (checked
 * against the live API on 2026-11-17: an hour's window returns just that
 * hour), so each boost's wagers are pulled for exactly its window and stored
 * in `wager_boost_totals`. Standings add `(multiplier − 1) × that wager` on top
 * of the normal daily totals.
 *
 * A boost counts toward the leaderboard whose days include its start.
 *
 * No `server-only` import: the sync job runs this under tsx too.
 */
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { wagerBoostTotals, wagerBoosts } from '@/server/db/schema';
import { fetchRoobetStats, type RoobetConfig } from '@/server/roobet/client';
import { audit } from './audit';
import { dayKey, type Metric } from './wagers';

export type WagerBoost = typeof wagerBoosts.$inferSelect;
export type BoostState = 'upcoming' | 'live' | 'ended';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ended boosts keep being re-pulled this long so late-settling bets land (same as the daily sync re-pulling yesterday). */
const RESYNC_AFTER_END_MS = 2 * DAY_MS;

export const MULTIPLIERS = [1.5, 2, 3] as const;

/** When the boost stops counting: its timer or the moment an admin turned it off, whichever came first. Null = still open-ended. */
export function boostEnd(b: WagerBoost): Date | null {
  const ends = [b.endsAt, b.stoppedAt].filter((d): d is Date => d != null);
  return ends.length ? new Date(Math.min(...ends.map((d) => d.getTime()))) : null;
}

export function boostState(b: WagerBoost, now = new Date()): BoostState {
  if (b.startsAt > now) return 'upcoming';
  const end = boostEnd(b);
  return end && end <= now ? 'ended' : 'live';
}

/** "Double points", "3× points", "1.5× points". */
export function boostLabel(multiplier: number) {
  return multiplier === 2 ? 'Double points' : `${multiplier}× points`;
}

/** The running boost, else the next scheduled one. */
export async function currentBoost(now = new Date()) {
  const [row] = await db
    .select()
    .from(wagerBoosts)
    .where(and(isNull(wagerBoosts.stoppedAt), or(isNull(wagerBoosts.endsAt), sql`${wagerBoosts.endsAt} > ${now}`)))
    .orderBy(wagerBoosts.startsAt)
    .limit(1);
  return row ?? null;
}

export async function recentBoosts(limit = 8) {
  return db.select().from(wagerBoosts).orderBy(desc(wagerBoosts.startsAt)).limit(limit);
}

/** Players who wagered in each boost's window and the extra it added, keyed by boost id. */
export async function boostSummaries(ids: string[]) {
  if (!ids.length) return new Map<string, { players: number; wagered: number }>();
  const rows = await db
    .select({
      boostId: wagerBoostTotals.boostId,
      players: sql<number>`count(*) filter (where ${wagerBoostTotals.wagered} > 0)::int`,
      wagered: sql<number>`coalesce(sum(${wagerBoostTotals.wagered}), 0)::float8`,
    })
    .from(wagerBoostTotals)
    .where(inArray(wagerBoostTotals.boostId, ids))
    .groupBy(wagerBoostTotals.boostId);
  return new Map(rows.map((r) => [r.boostId, { players: r.players, wagered: r.wagered }]));
}

export class BoostError extends Error {}

export async function startBoost(input: { multiplier: number; startsAt: Date; endsAt: Date | null; actorId: string }) {
  if (await currentBoost()) throw new BoostError('A double-points window is already on or scheduled. Turn it off first.');
  const [row] = await db
    .insert(wagerBoosts)
    .values({ multiplier: input.multiplier, startsAt: input.startsAt, endsAt: input.endsAt, createdBy: input.actorId })
    .returning();
  await audit(input.actorId, 'boost.start', 'wager_boost', row.id, null, row);
  return row;
}

/** Turn a running boost off now; a scheduled one that hasn't started is just cancelled. */
export async function stopBoost(id: string, actorId: string) {
  const [b] = await db.select().from(wagerBoosts).where(eq(wagerBoosts.id, id)).limit(1);
  if (!b) throw new BoostError('That double-points window no longer exists.');
  const now = new Date();
  if (boostState(b, now) === 'upcoming') {
    await db.delete(wagerBoosts).where(eq(wagerBoosts.id, id));
    await audit(actorId, 'boost.cancel', 'wager_boost', id, b, null);
    return 'cancelled' as const;
  }
  if (boostState(b, now) === 'ended') return 'ended' as const;
  await db.update(wagerBoosts).set({ stoppedAt: now }).where(eq(wagerBoosts.id, id));
  await audit(actorId, 'boost.stop', 'wager_boost', id, b, { stoppedAt: now });
  return 'stopped' as const;
}

/** Start a scheduled boost right away, keeping its length. */
export async function startBoostNow(id: string, actorId: string) {
  const [b] = await db.select().from(wagerBoosts).where(eq(wagerBoosts.id, id)).limit(1);
  if (!b || boostState(b) !== 'upcoming') throw new BoostError('That window has already started.');
  const now = new Date();
  const endsAt = b.endsAt ? new Date(now.getTime() + (b.endsAt.getTime() - b.startsAt.getTime())) : null;
  await db.update(wagerBoosts).set({ startsAt: now, endsAt }).where(eq(wagerBoosts.id, id));
  await audit(actorId, 'boost.start_now', 'wager_boost', id, b, { startsAt: now, endsAt });
}

/** Push a timed boost's end out by `minutes`. */
export async function extendBoost(id: string, minutes: number, actorId: string) {
  const [b] = await db.select().from(wagerBoosts).where(eq(wagerBoosts.id, id)).limit(1);
  if (!b || boostState(b) === 'ended') throw new BoostError('That double-points window has already ended.');
  if (!b.endsAt) throw new BoostError('This one runs until you turn it off, so there is nothing to extend.');
  const endsAt = new Date(b.endsAt.getTime() + minutes * 60_000);
  await db.update(wagerBoosts).set({ endsAt }).where(eq(wagerBoosts.id, id));
  await audit(actorId, 'boost.extend', 'wager_boost', id, { endsAt: b.endsAt }, { endsAt });
  return endsAt;
}

/**
 * Pull each running (or recently ended) boost's wagers for exactly its window.
 * Called from the regular Roobet sync, before leaderboards freeze.
 */
export async function syncWagerBoosts(config: RoobetConfig, now = new Date()) {
  const since = new Date(now.getTime() - RESYNC_AFTER_END_MS);
  const boosts = await db
    .select()
    .from(wagerBoosts)
    .where(
      and(
        lte(wagerBoosts.startsAt, now),
        or(isNull(wagerBoosts.endsAt), gte(wagerBoosts.endsAt, since)),
        or(isNull(wagerBoosts.stoppedAt), gte(wagerBoosts.stoppedAt, since)),
      ),
    );

  let rows = 0;
  for (const b of boosts) {
    const end = boostEnd(b);
    const to = end && end < now ? end : now;
    if (to <= b.startsAt) continue;
    const stats = await fetchRoobetStats(config, b.startsAt, to);
    if (stats.length) {
      await db
        .insert(wagerBoostTotals)
        .values(
          stats.map((r) => ({
            boostId: b.id,
            roobetUid: r.uid,
            username: r.username,
            wagered: r.wagered,
            weightedWagered: r.weightedWagered,
          })),
        )
        .onConflictDoUpdate({
          target: [wagerBoostTotals.boostId, wagerBoostTotals.roobetUid],
          set: {
            username: sql`excluded.username`,
            wagered: sql`excluded.wagered`,
            weightedWagered: sql`excluded.weighted_wagered`,
            updatedAt: now,
          },
        });
    }
    await db.update(wagerBoosts).set({ lastSyncedAt: now }).where(eq(wagerBoosts.id, b.id));
    rows += stats.length;
  }
  return { boosts: boosts.length, rows };
}

/**
 * Extra leaderboard wager per Roobet uid from boosts that started within the
 * board's days (UTC, inclusive, same as the board's own window).
 */
export async function boostBonusFor(from: Date, to: Date, metric: Metric) {
  const lo = new Date(`${dayKey(from)}T00:00:00Z`);
  const hi = new Date(new Date(`${dayKey(to)}T00:00:00Z`).getTime() + DAY_MS);
  const col = metric === 'weighted' ? wagerBoostTotals.weightedWagered : wagerBoostTotals.wagered;
  const rows = await db
    .select({
      roobetUid: wagerBoostTotals.roobetUid,
      bonus: sql<number>`coalesce(sum((${wagerBoosts.multiplier} - 1) * ${col}), 0)::float8`,
    })
    .from(wagerBoostTotals)
    .innerJoin(wagerBoosts, eq(wagerBoosts.id, wagerBoostTotals.boostId))
    .where(and(gte(wagerBoosts.startsAt, lo), lt(wagerBoosts.startsAt, hi)))
    .groupBy(wagerBoostTotals.roobetUid);
  return new Map(rows.filter((r) => r.bonus > 0).map((r) => [r.roobetUid, r.bonus]));
}
