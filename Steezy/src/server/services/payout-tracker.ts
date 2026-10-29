/**
 * "Total paid out to date" on the home page: every prize staff have marked
 * paid (leaderboards, milestones, raffles, giveaways, guess-the-balance and
 * tournament prizes), plus whatever was paid before the site existed, which
 * admins enter by hand on the Payouts page. Giveaway, hunt and tournament
 * prizes are free text ("$100 tip"), so their dollar amount is read from it.
 */
import { and, eq, gt, isNotNull, isNull, sql, type AnyColumn } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  bonusHunts,
  giveawayWinners,
  giveaways,
  leaderboardResults,
  milestoneClaims,
  milestones,
  raffleWinners,
  settings,
  tourneyGames,
} from '@/server/db/schema';

const KEY = 'payout_tracker';
/** What Steezy had paid out before the site, until an admin saves a different figure. */
const DEFAULT_EARLIER = 9000;

export type PayoutTrackerSettings = {
  /** Paid out before the site tracked payouts. */
  earlier: number;
  /** "YYYY-MM-DD" shown as "since …" on the home page; null hides it. */
  since: string | null;
};

export async function getPayoutTrackerSettings(): Promise<PayoutTrackerSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const value = (row?.value ?? {}) as Partial<PayoutTrackerSettings>;
  return { earlier: value.earlier === undefined ? DEFAULT_EARLIER : Number(value.earlier) || 0, since: value.since ?? null };
}

export async function savePayoutTrackerSettings(value: PayoutTrackerSettings) {
  await db
    .insert(settings)
    .values({ key: KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** "$1,250 tip" → 1250, "50 USD" → 50, "Signed hoodie" → 0. */
export function prizeAmount(text: string | null) {
  const match = text?.match(/\d[\d,]*(?:\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, '')) : 0;
}

const sum = (column: AnyColumn) => sql<number>`coalesce(sum(${column}), 0)::float8`.mapWith(Number);

export async function payoutTotals() {
  const [config, [lb], [ms], [raffle], giveawayRows, huntRows, tourneyRows] = await Promise.all([
    getPayoutTrackerSettings(),
    db
      .select({ total: sum(leaderboardResults.prize) })
      .from(leaderboardResults)
      .where(and(isNotNull(leaderboardResults.paidAt), isNull(leaderboardResults.deniedAt))),
    db
      .select({ total: sum(milestones.reward) })
      .from(milestoneClaims)
      .innerJoin(milestones, eq(milestones.id, milestoneClaims.milestoneId))
      .where(eq(milestoneClaims.status, 'paid')),
    db
      .select({ total: sum(raffleWinners.prize) })
      .from(raffleWinners)
      .where(and(isNotNull(raffleWinners.paidAt), isNull(raffleWinners.deniedAt), gt(raffleWinners.prize, 0))),
    db
      .select({ prize: giveaways.prize })
      .from(giveawayWinners)
      .innerJoin(giveaways, eq(giveaways.id, giveawayWinners.giveawayId))
      .where(and(isNotNull(giveawayWinners.paidAt), isNull(giveawayWinners.deniedAt))),
    db.select({ prize: bonusHunts.gtbPrize }).from(bonusHunts).where(isNotNull(bonusHunts.gtbPrizePaidAt)),
    db.select({ prize: tourneyGames.prize }).from(tourneyGames).where(isNotNull(tourneyGames.prizePaidAt)),
  ]);

  const leaderboards = lb?.total ?? 0;
  const giveawaysAndRaffles = (raffle?.total ?? 0) + giveawayRows.reduce((s, r) => s + prizeAmount(r.prize), 0);
  const tips = (ms?.total ?? 0) + [...huntRows, ...tourneyRows].reduce((s, r) => s + prizeAmount(r.prize), 0);

  return {
    total: config.earlier + leaderboards + giveawaysAndRaffles + tips,
    leaderboards,
    giveawaysAndRaffles,
    tips,
    earlier: config.earlier,
    since: config.since,
  };
}
