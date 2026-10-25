/**
 * Roobet wager sync.
 *
 * The API only returns totals for a window, so we ask for one UTC day at a
 * time and upsert `roobet_daily_wager`. Leaderboards, milestones and raffles
 * all sum those days. Each regular run re-pulls yesterday as well as today so
 * late-settling bets land. A failed day leaves the stored numbers alone.
 *
 * No `server-only` import: the backfill CLI (`npm run roobet:sync`) runs this
 * file directly under tsx.
 */
import { and, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { leaderboards, roobetDailyWager, syncState } from '@/server/db/schema';
import { fetchRoobetStats, type RoobetConfig } from './client';

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function roobetConfigFromEnv(): RoobetConfig | null {
  const userId = process.env.ROOBET_USER_ID?.trim();
  const apiKey = process.env.ROOBET_API_KEY?.trim();
  if (!userId || !apiKey) return null;
  return {
    apiUrl: process.env.ROOBET_API_URL?.trim() || 'https://roobetconnect.com/affiliate/v2/stats',
    userId,
    apiKey,
  };
}

export async function syncRoobetDay(config: RoobetConfig, day: Date) {
  const start = utcMidnight(day);
  const end = new Date(start.getTime() + DAY_MS - 1);
  const rows = await fetchRoobetStats(config, start, end);
  if (!rows.length) return 0;

  await db
    .insert(roobetDailyWager)
    .values(
      rows.map((r) => ({
        roobetUid: r.uid,
        day: dayKey(start),
        username: r.username,
        wagered: r.wagered,
        weightedWagered: r.weightedWagered,
        highestMultiplier: r.highestMultiplier ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: [roobetDailyWager.roobetUid, roobetDailyWager.day],
      set: {
        username: sql`excluded.username`,
        wagered: sql`excluded.wagered`,
        weightedWagered: sql`excluded.weighted_wagered`,
        highestMultiplier: sql`excluded.highest_multiplier`,
        updatedAt: new Date(),
      },
    });
  return rows.length;
}

export type SyncResult = { ok: boolean; days: number; rows: number; error?: string };

/** Sync every UTC day from `from` through today, oldest first. */
export async function syncRoobetRange(config: RoobetConfig, from: Date, to = new Date()): Promise<SyncResult> {
  let rows = 0;
  let days = 0;
  const now = new Date();
  try {
    for (let d = utcMidnight(from); d <= to; d = new Date(d.getTime() + DAY_MS)) {
      rows += await syncRoobetDay(config, d);
      days++;
    }
    await db
      .insert(syncState)
      .values({ key: 'roobet', lastRunAt: now, lastOkAt: now, lastError: null, detail: { days, rows } })
      .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastOkAt: now, lastError: null, detail: { days, rows } } });
    return { ok: true, days, rows };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .insert(syncState)
      .values({ key: 'roobet', lastRunAt: now, lastError: message })
      .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastError: message } });
    return { ok: false, days, rows, error: message };
  }
}

/** The regular run: yesterday and today. */
export async function syncRoobetRecent(config: RoobetConfig) {
  return syncRoobetRange(config, new Date(Date.now() - DAY_MS));
}

/**
 * Every day of the running leaderboards, so a board that started before the
 * server (or before the last deploy) still counts its first days. Falls back
 * to the regular run when no board is live.
 */
export async function syncLiveBoardWindows(config: RoobetConfig) {
  const [row] = await db
    .select({ from: sql<Date | null>`min(${leaderboards.startsAt})` })
    .from(leaderboards)
    .where(and(inArray(leaderboards.status, ['live', 'draft']), lte(leaderboards.startsAt, new Date()), gte(leaderboards.endsAt, new Date())));
  const from = row?.from ? new Date(row.from) : null;
  return from && from.getTime() < Date.now() - DAY_MS ? syncRoobetRange(config, from) : syncRoobetRecent(config);
}
