/**
 * Wager totals from `roobet_daily_wager`.
 *
 * Days are UTC calendar days, so a window covers every day whose date falls
 * between the window's start and end dates (inclusive).
 *
 * No `server-only` import: the seed script and jobs use this under tsx too.
 */
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { roobetDailyWager, roobetLinks, users } from '@/server/db/schema';

export type Metric = 'wagered' | 'weighted';

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function metricColumn(metric: Metric) {
  return metric === 'weighted' ? roobetDailyWager.weightedWagered : roobetDailyWager.wagered;
}

export type WagerTotal = {
  roobetUid: string;
  /** Most recent Roobet username seen for this uid. */
  roobetUsername: string;
  total: number;
  userId: string | null;
  nameOnLeaderboards: boolean;
  blocked: boolean;
};

/** Per-player totals in a window, highest first, joined to the member who owns that Roobet account (if any). */
export async function wagerTotals(from: Date, to: Date, metric: Metric = 'wagered'): Promise<WagerTotal[]> {
  const col = metricColumn(metric);
  const rows = await db
    .select({
      roobetUid: roobetDailyWager.roobetUid,
      roobetUsername: sql<string>`(array_agg(${roobetDailyWager.username} order by ${roobetDailyWager.day} desc))[1]`,
      total: sql<number>`coalesce(sum(${col}), 0)::float8`,
      userId: roobetLinks.userId,
      nameOnLeaderboards: users.nameOnLeaderboards,
      blocked: users.blockedFromRewards,
    })
    .from(roobetDailyWager)
    .leftJoin(roobetLinks, and(eq(roobetLinks.roobetUid, roobetDailyWager.roobetUid), eq(roobetLinks.status, 'approved')))
    .leftJoin(users, eq(users.id, roobetLinks.userId))
    .where(and(gte(roobetDailyWager.day, dayKey(from)), lte(roobetDailyWager.day, dayKey(to))))
    .groupBy(roobetDailyWager.roobetUid, roobetLinks.userId, users.nameOnLeaderboards, users.blockedFromRewards)
    .orderBy(sql`3 desc`);

  return rows.map((r) => ({
    ...r,
    userId: r.userId ?? null,
    nameOnLeaderboards: r.nameOnLeaderboards ?? false,
    blocked: r.blocked ?? false,
  }));
}

/** A single Roobet account's total in a window (or all time when `from` is null). */
export async function wagerTotalFor(roobetUid: string, from: Date | null, to: Date | null = null, metric: Metric = 'wagered') {
  const col = metricColumn(metric);
  const conds = [eq(roobetDailyWager.roobetUid, roobetUid)];
  if (from) conds.push(gte(roobetDailyWager.day, dayKey(from)));
  if (to) conds.push(lte(roobetDailyWager.day, dayKey(to)));
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${col}), 0)::float8` })
    .from(roobetDailyWager)
    .where(and(...conds));
  return row.total;
}

/** The approved Roobet uid for a member, or null. */
export async function approvedRoobetUid(userId: string) {
  const [row] = await db
    .select({ uid: roobetLinks.roobetUid })
    .from(roobetLinks)
    .where(and(eq(roobetLinks.userId, userId), eq(roobetLinks.status, 'approved')))
    .limit(1);
  return row?.uid ?? null;
}
