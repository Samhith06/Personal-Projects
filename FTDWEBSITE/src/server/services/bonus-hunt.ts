/**
 * Bonus hunts.
 *
 * The database holds only what was observed: the start balance, and each bonus
 * with its bet and — once opened — its payout. Every figure the board shows is
 * worked out from those here, so the running average can never disagree with
 * the bonuses it was averaged from.
 */
import 'server-only';
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  bonusHuntBonuses,
  bonusHuntCalls,
  bonusHuntGuesses,
  bonusHunts,
  wins,
  type BonusHunt,
  type BonusHuntBonus,
  type BonusHuntCall,
  type BonusHuntGuess,
} from '@/server/db/schema';
import type { BonusHuntView, GameSuggestion, GtbPlace, HuntBonusView } from '@/lib/types';

/** A hunt is on screen from the moment it starts collecting until it is finished. */
const LIVE_STATUSES = ['collecting', 'guessing', 'opening'] as const;
/** When more than one hunt is live, the one furthest along is the one to show. */
const LIVE_PRIORITY: Record<string, number> = { opening: 0, guessing: 1, collecting: 2 };

/** How long a stream overlay keeps showing a hunt's result after it finishes. */
const OVERLAY_LINGER_MS = 60 * 60 * 1000;

/** The hunt on screen, optionally for one channel only (each creator's overlay). */
export async function getActiveHunt(streamerId?: string): Promise<BonusHuntView | null> {
  const live = await db
    .select()
    .from(bonusHunts)
    .where(and(inArray(bonusHunts.status, [...LIVE_STATUSES]), streamerId ? eq(bonusHunts.streamerId, streamerId) : undefined))
    .orderBy(desc(bonusHunts.startedAt));

  // One being opened beats one taking guesses beats one still collecting, so
  // the board shows the hunt with the most going on.
  const [hunt] = live.sort((a, b) => (LIVE_PRIORITY[a.status] ?? 9) - (LIVE_PRIORITY[b.status] ?? 9));
  return hunt ? withBonuses(hunt) : null;
}

/**
 * What a channel's stream overlay shows: its live hunt, or — for an hour after
 * the last bonus is opened — the finished one, so the result stays on screen
 * while the streamer talks about it instead of vanishing the moment it ends.
 */
export async function getOverlayHunt(streamerId: string): Promise<BonusHuntView | null> {
  const live = await getActiveHunt(streamerId);
  if (live) return live;
  const [recent] = await db
    .select()
    .from(bonusHunts)
    .where(
      and(
        eq(bonusHunts.streamerId, streamerId),
        eq(bonusHunts.status, 'complete'),
        gt(bonusHunts.endedAt, new Date(Date.now() - OVERLAY_LINGER_MS)),
      ),
    )
    .orderBy(desc(bonusHunts.endedAt))
    .limit(1);
  return recent ? withBonuses(recent) : null;
}

export async function getHunt(id: string): Promise<BonusHuntView | null> {
  const [hunt] = await db.select().from(bonusHunts).where(eq(bonusHunts.id, id)).limit(1);
  return hunt ? withBonuses(hunt) : null;
}

/** Finished hunts, newest first. */
export async function getCompletedHunts(limit = 12): Promise<BonusHuntView[]> {
  const rows = await db
    .select()
    .from(bonusHunts)
    .where(eq(bonusHunts.status, 'complete'))
    .orderBy(desc(bonusHunts.endedAt))
    .limit(limit);
  return Promise.all(rows.map(withBonuses));
}

/**
 * Every finished hunt, newest first, with the figures across all of them.
 *
 * Totals are summed from the same per-hunt `summarise` the board uses, so the
 * history can never disagree with the hunts it is made of. A hunt closed by
 * hand with bonuses still unopened counts what was opened, nothing more.
 */
export async function getHuntHistory(streamerId?: string): Promise<HuntHistory> {
  const rows = await db
    .select()
    .from(bonusHunts)
    .where(and(eq(bonusHunts.status, 'complete'), streamerId ? eq(bonusHunts.streamerId, streamerId) : undefined))
    .orderBy(desc(bonusHunts.endedAt));
  const hunts = await Promise.all(rows.map(withBonuses));

  const invested = round(sum(hunts.map((h) => h.startBalance)));
  const returned = round(sum(hunts.map((h) => h.stats.won)));
  const opened = hunts.flatMap((h) => h.bonuses.filter((b) => b.payout !== null).map((b) => ({ ...b, huntTitle: h.title })));
  const openedBet = sum(opened.map((b) => b.bet));

  const xOf = (b: { payout: number | null; bet: number }) => (b.bet ? (b.payout ?? 0) / b.bet : 0);
  const best = opened.reduce<(typeof opened)[number] | null>((top, b) => (!top || xOf(b) > xOf(top) ? b : top), null);
  const byProfit = [...hunts].sort((a, b) => b.stats.profit - a.stats.profit);

  // How each bonus type pays, and the games played most — the questions a crew asks after a month of hunts.
  const group = <K extends string>(keyOf: (b: (typeof opened)[number]) => K) => {
    const m = new Map<K, { count: number; bet: number; won: number }>();
    for (const b of opened) {
      const k = keyOf(b);
      const e = m.get(k) ?? { count: 0, bet: 0, won: 0 };
      e.count += 1;
      e.bet += b.bet;
      e.won += b.payout ?? 0;
      m.set(k, e);
    }
    return [...m.entries()].map(([key, e]) => ({ key, count: e.count, averageX: e.bet ? e.won / e.bet : null }));
  };

  return {
    hunts,
    totals: {
      hunts: hunts.length,
      inProfit: hunts.filter((h) => h.stats.profit >= 0).length,
      invested,
      returned,
      profit: round(returned - invested),
      bonuses: opened.length,
      averageX: openedBet ? returned / openedBet : null,
      best: best ? { game: best.game, huntTitle: best.huntTitle, bet: best.bet, payout: best.payout ?? 0 } : null,
      bestHunt: byProfit[0] ? { title: byProfit[0].title, profit: byProfit[0].stats.profit } : null,
      worstHunt: byProfit.at(-1) ? { title: byProfit.at(-1)!.title, profit: byProfit.at(-1)!.stats.profit } : null,
      byKind: group((b) => b.kind),
      topGames: group((b) => b.game.trim().toLowerCase())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((g) => ({ ...g, key: opened.find((b) => b.game.trim().toLowerCase() === g.key)?.game ?? g.key })),
    },
  };
}

export type HuntHistory = {
  hunts: BonusHuntView[];
  totals: {
    hunts: number;
    inProfit: number;
    invested: number;
    returned: number;
    profit: number;
    bonuses: number;
    averageX: number | null;
    best: { game: string; huntTitle: string; bet: number; payout: number } | null;
    bestHunt: { title: string; profit: number } | null;
    worstHunt: { title: string; profit: number } | null;
    byKind: { key: string; count: number; averageX: number | null }[];
    topGames: { key: string; count: number; averageX: number | null }[];
  };
};

/** Every hunt a channel owns, for the admin list. */
export async function getHuntsForAdmin(streamerId?: string): Promise<BonusHuntView[]> {
  const rows = await db
    .select()
    .from(bonusHunts)
    .where(streamerId ? eq(bonusHunts.streamerId, streamerId) : undefined)
    .orderBy(desc(bonusHunts.startedAt))
    .limit(50);
  return Promise.all(rows.map(withBonuses));
}

export function isLiveStatus(status: string) {
  return (LIVE_STATUSES as readonly string[]).includes(status);
}

/** The next unopened bonus, used by the admin panel to open them in order. */
export async function getNextBonus(huntId: string): Promise<BonusHuntBonus | null> {
  const [next] = await db
    .select()
    .from(bonusHuntBonuses)
    .where(and(eq(bonusHuntBonuses.huntId, huntId), isNull(bonusHuntBonuses.payout)))
    .orderBy(asc(bonusHuntBonuses.position))
    .limit(1);
  return next ?? null;
}

/**
 * The chat calls on a hunt for the admin queue: still waiting first, oldest
 * first, so the streamer works through them in the order chat made them.
 */
export async function getHuntCalls(huntId: string): Promise<BonusHuntCall[]> {
  return db
    .select()
    .from(bonusHuntCalls)
    .where(eq(bonusHuntCalls.huntId, huntId))
    .orderBy(asc(bonusHuntCalls.createdAt));
}

/** Every guess on a hunt, newest first — what the admin sees while guessing is open. */
export async function getHuntGuesses(huntId: string): Promise<BonusHuntGuess[]> {
  return db
    .select()
    .from(bonusHuntGuesses)
    .where(eq(bonusHuntGuesses.huntId, huntId))
    .orderBy(desc(bonusHuntGuesses.guessedAt));
}

/**
 * Guesses ordered by how close they came to the final balance. Two guesses
 * the same distance away go to whoever made theirs first.
 */
export function rankGuesses(guesses: BonusHuntGuess[], finalBalance: number): GtbPlace[] {
  return [...guesses]
    .sort((a, b) => {
      const d = Math.abs(a.guess - finalBalance) - Math.abs(b.guess - finalBalance);
      return d !== 0 ? d : a.guessedAt.getTime() - b.guessedAt.getTime();
    })
    .map((g) => ({ username: g.kickUsername, guess: g.guess, off: round(Math.abs(g.guess - finalBalance)) }));
}

async function withBonuses(hunt: BonusHunt): Promise<BonusHuntView> {
  const [bonuses, guesses] = await Promise.all([
    db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.huntId, hunt.id)).orderBy(asc(bonusHuntBonuses.position)),
    db.select().from(bonusHuntGuesses).where(eq(bonusHuntGuesses.huntId, hunt.id)),
  ]);
  return summarise(hunt, bonuses, guesses);
}

/**
 * Turn a hunt and its bonuses into everything the board renders.
 *
 * Exported so the same arithmetic serves the public board, the admin panel and
 * anything that later ingests a hunt from an external tracker — there is one
 * definition of "break-even" in the codebase, not three.
 */
export function summarise(hunt: BonusHunt, bonuses: BonusHuntBonus[], guesses: BonusHuntGuess[] = []): BonusHuntView {
  const opened = bonuses.filter((b) => b.payout !== null);
  const totalBet = sum(bonuses.map((b) => b.bet));
  const openedBet = sum(opened.map((b) => b.bet));
  const remainingBet = round(totalBet - openedBet);
  const won = round(sum(opened.map((b) => b.payout ?? 0)));

  // What every bonus has to average for the hunt to come back level.
  const breakEvenX = totalBet > 0 ? hunt.startBalance / totalBet : null;
  // What they have averaged so far.
  const runningX = openedBet > 0 ? won / openedBet : null;
  /*
   * What the ones still to open have to average from here. Once the hunt is
   * already in profit this goes negative, which is not a meaningful target —
   * report it as zero so the board can say "already paid for itself" instead
   * of printing a nonsense figure.
   */
  const requiredX = remainingBet > 0 ? Math.max(0, (hunt.startBalance - won) / remainingBet) : null;

  const best = opened.reduce<BonusHuntBonus | null>((top, b) => {
    if (!b.bet) return top;
    const x = (b.payout ?? 0) / b.bet;
    const topX = top && top.bet ? (top.payout ?? 0) / top.bet : -1;
    return x > topX ? b : top;
  }, null);

  return {
    id: hunt.id,
    streamerId: hunt.streamerId,
    title: hunt.title,
    status: hunt.status,
    startBalance: hunt.startBalance,
    startedAt: hunt.startedAt.toISOString(),
    endedAt: hunt.endedAt?.toISOString() ?? null,
    source: hunt.source,
    bonuses: bonuses.map(toView),
    gtb: {
      guesses: guesses.length,
      // The final balance only exists once the hunt is finished; before that nobody has won.
      winner: hunt.status === 'complete' ? (rankGuesses(guesses, won)[0] ?? null) : null,
    },
    stats: {
      total: bonuses.length,
      opened: opened.length,
      remaining: bonuses.length - opened.length,
      totalBet: round(totalBet),
      remainingBet,
      won,
      // Profit is only meaningful once the hunt has actually finished; while it
      // is running this is "up to here", which the board labels as such.
      profit: round(won - hunt.startBalance),
      breakEvenX,
      runningX,
      requiredX,
      bestId: best?.id ?? null,
    },
  };
}

const toView = (b: BonusHuntBonus): HuntBonusView => ({
  id: b.id,
  position: b.position,
  game: b.game,
  provider: b.provider,
  bet: b.bet,
  payout: b.payout,
  openedAt: b.openedAt?.toISOString() ?? null,
  kind: b.kind,
  calledBy: b.calledBy,
});

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
/** Money adds up in binary badly; keep totals to the cent. */
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Games already recorded on this site, most-used first.
 *
 * Feeds the autocomplete on the admin bonus form. Hunts reuse the same slots
 * constantly, so the list a channel builds by logging hunts is the list it
 * actually needs — no external catalogue required. Wall of Fame entries are
 * folded in because a game big enough to win on is a game worth suggesting.
 *
 * A game is matched case-insensitively but suggested with the spelling used
 * most often, so "sugar rush 1000" typed once does not fork the list.
 */
export async function getGameSuggestions(limit = 300): Promise<GameSuggestion[]> {
  const n = sql<number>`count(*)`;
  const [fromHunts, fromWins] = await Promise.all([
    db
      .select({ game: bonusHuntBonuses.game, provider: bonusHuntBonuses.provider, n })
      .from(bonusHuntBonuses)
      .groupBy(bonusHuntBonuses.game, bonusHuntBonuses.provider),
    db.select({ game: wins.game, provider: wins.provider, n }).from(wins).groupBy(wins.game, wins.provider),
  ]);

  const merged = new Map<string, { game: string; provider: string; uses: number; spellings: Map<string, number> }>();

  for (const row of [...fromHunts, ...fromWins]) {
    const game = row.game.trim();
    if (!game) continue;
    const key = game.toLowerCase();
    const uses = Number(row.n) || 1;
    const entry = merged.get(key) ?? { game, provider: '', uses: 0, spellings: new Map() };
    entry.uses += uses;
    entry.spellings.set(game, (entry.spellings.get(game) ?? 0) + uses);
    // Keep the first provider seen for the game; a blank never overwrites a real one.
    if (!entry.provider && row.provider?.trim()) entry.provider = row.provider.trim();
    merged.set(key, entry);
  }

  return [...merged.values()]
    .map((e) => ({
      game: [...e.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      provider: e.provider,
      uses: e.uses,
    }))
    .sort((a, b) => b.uses - a.uses || a.game.localeCompare(b.game))
    .slice(0, limit);
}
