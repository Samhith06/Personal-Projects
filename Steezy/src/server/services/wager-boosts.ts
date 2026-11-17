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
 * Weekly schedules ("every Friday 20:00–22:00") turn into ordinary boosts a
 * few hours ahead, so the leaderboard shows the "starts in" countdown. The
 * Discord #leaderboard channel (same webhook as the standings) gets a post
 * when one is scheduled, when it starts and when it ends. No Kick chat posts.
 *
 * No `server-only` import: the sync job runs this under tsx too.
 */
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { wagerBoostSchedules, wagerBoostTotals, wagerBoosts } from '@/server/db/schema';
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
  // Turned off, or a scheduled one cancelled before it started.
  if (b.stoppedAt && b.stoppedAt <= now) return 'ended';
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
  if (row.startsAt.getTime() > Date.now() + 60_000) await postTeaser(row);
  return row;
}

/** Turn a running boost off now; a scheduled one that hasn't started is just cancelled. */
export async function stopBoost(id: string, actorId: string) {
  const [b] = await db.select().from(wagerBoosts).where(eq(wagerBoosts.id, id)).limit(1);
  if (!b) throw new BoostError('That double-points window no longer exists.');
  const now = new Date();
  if (boostState(b, now) === 'upcoming') {
    // A weekly one keeps its row (stopped before it started) so the schedule doesn't make it again.
    if (b.occurrenceKey) await db.update(wagerBoosts).set({ stoppedAt: now, announcedEndAt: now }).where(eq(wagerBoosts.id, id));
    else await db.delete(wagerBoosts).where(eq(wagerBoosts.id, id));
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
 * board's days (UTC, inclusive, same as the board's own window), and the
 * highest multiplier each played under (for the "2×" badge).
 */
export async function boostBonusFor(from: Date, to: Date, metric: Metric) {
  const lo = new Date(`${dayKey(from)}T00:00:00Z`);
  const hi = new Date(new Date(`${dayKey(to)}T00:00:00Z`).getTime() + DAY_MS);
  const col = metric === 'weighted' ? wagerBoostTotals.weightedWagered : wagerBoostTotals.wagered;
  const rows = await db
    .select({
      roobetUid: wagerBoostTotals.roobetUid,
      bonus: sql<number>`coalesce(sum((${wagerBoosts.multiplier} - 1) * ${col}), 0)::float8`,
      multiplier: sql<number>`max(${wagerBoosts.multiplier}) filter (where ${col} > 0)::float8`,
    })
    .from(wagerBoostTotals)
    .innerJoin(wagerBoosts, eq(wagerBoosts.id, wagerBoostTotals.boostId))
    .where(and(gte(wagerBoosts.startsAt, lo), lt(wagerBoosts.startsAt, hi)))
    .groupBy(wagerBoostTotals.roobetUid);
  return new Map(rows.filter((r) => r.bonus > 0).map((r) => [r.roobetUid, { bonus: r.bonus, multiplier: r.multiplier }]));
}

/* ------------------------------------------------------------ Weekly windows */

export type BoostSchedule = typeof wagerBoostSchedules.$inferSelect;

/** Make a schedule's next window this long before it starts, so the "starts in" countdown shows. */
const SCHEDULE_LEAD_MS = 3 * 60 * 60 * 1000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How far `tz`'s wall clock is ahead of UTC at instant `at`. */
function tzOffsetMs(at: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - Math.floor(at / 1000) * 1000;
}

/** The instant a wall-clock time on a date happens in `tz` (DST-safe). */
function zonedInstant(y: number, m0: number, d: number, minute: number, tz: string) {
  const wall = Date.UTC(y, m0, d, 0, minute);
  const first = wall - tzOffsetMs(wall, tz);
  return new Date(wall - tzOffsetMs(first, tz));
}

export function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The schedule's next window that hasn't finished yet (it may already be running). */
export function nextOccurrence(
  s: Pick<BoostSchedule, 'id' | 'weekday' | 'startMinute' | 'durationMinutes' | 'timeZone'>,
  now = new Date(),
) {
  const local = new Date(now.getTime() + tzOffsetMs(now.getTime(), s.timeZone));
  // Start from yesterday so a window that began before local midnight is still found.
  for (let i = -1; i <= 7; i++) {
    const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + i));
    if (day.getUTCDay() !== s.weekday) continue;
    const start = zonedInstant(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), s.startMinute, s.timeZone);
    const end = new Date(start.getTime() + s.durationMinutes * 60_000);
    if (end > now) return { start, end, key: `${s.id}:${day.toISOString().slice(0, 10)}` };
  }
  throw new Error('unreachable: every weekday occurs within 8 days');
}

export async function listSchedules() {
  return db
    .select()
    .from(wagerBoostSchedules)
    .where(eq(wagerBoostSchedules.active, true))
    .orderBy(wagerBoostSchedules.weekday, wagerBoostSchedules.startMinute);
}

export async function createSchedule(input: {
  multiplier: number;
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  timeZone: string;
  actorId: string;
}) {
  const [row] = await db
    .insert(wagerBoostSchedules)
    .values({
      multiplier: input.multiplier,
      weekday: input.weekday,
      startMinute: input.startMinute,
      durationMinutes: input.durationMinutes,
      timeZone: input.timeZone,
      createdBy: input.actorId,
    })
    .returning();
  await audit(input.actorId, 'boost_schedule.create', 'wager_boost_schedule', row.id, null, row);
  await materializeSchedules();
  return row;
}

/** Stop repeating. A window it already made that hasn't started is cancelled; one that's running keeps going. */
export async function deleteSchedule(id: string, actorId: string) {
  const [s] = await db.select().from(wagerBoostSchedules).where(eq(wagerBoostSchedules.id, id)).limit(1);
  if (!s) throw new BoostError('That schedule no longer exists.');
  const now = new Date();
  await db.update(wagerBoostSchedules).set({ active: false }).where(eq(wagerBoostSchedules.id, id));
  await db
    .update(wagerBoosts)
    .set({ stoppedAt: now, announcedEndAt: now })
    .where(and(eq(wagerBoosts.scheduleId, id), isNull(wagerBoosts.stoppedAt), sql`${wagerBoosts.startsAt} > ${now}`));
  await audit(actorId, 'boost_schedule.delete', 'wager_boost_schedule', id, s, null);
}

/** Skip the schedule's next window (whether or not it's been made yet). */
export async function skipNextOccurrence(id: string, actorId: string) {
  const [s] = await db.select().from(wagerBoostSchedules).where(eq(wagerBoostSchedules.id, id)).limit(1);
  if (!s || !s.active) throw new BoostError('That schedule no longer exists.');
  const now = new Date();
  const occ = nextOccurrence(s, now);
  if (occ.start <= now) throw new BoostError('This week’s window is already running. Use “Turn off now” instead.');
  const [made] = await db.select().from(wagerBoosts).where(eq(wagerBoosts.occurrenceKey, occ.key)).limit(1);
  if (made) {
    await db.update(wagerBoosts).set({ stoppedAt: now, announcedEndAt: now }).where(eq(wagerBoosts.id, made.id));
  } else {
    // A placeholder that's already stopped, so the schedule treats this week as done.
    await db.insert(wagerBoosts).values({
      multiplier: s.multiplier,
      startsAt: occ.start,
      endsAt: occ.end,
      stoppedAt: now,
      announcedStartAt: now,
      announcedEndAt: now,
      scheduleId: s.id,
      occurrenceKey: occ.key,
      createdBy: actorId,
    });
  }
  await audit(actorId, 'boost_schedule.skip', 'wager_boost_schedule', id, null, { start: occ.start });
  return occ.start;
}

/**
 * Turn each schedule's next window into a boost once it's within the lead
 * time. Skips while another double-points window is on or scheduled (they
 * never stack); if that one ends mid-window, this one starts from then.
 */
export async function materializeSchedules(now = new Date()) {
  const schedules = await listSchedules();
  let made = 0;
  for (const s of schedules) {
    const occ = nextOccurrence(s, now);
    if (occ.start.getTime() - now.getTime() > SCHEDULE_LEAD_MS) continue;
    const [exists] = await db
      .select({ id: wagerBoosts.id })
      .from(wagerBoosts)
      .where(eq(wagerBoosts.occurrenceKey, occ.key))
      .limit(1);
    if (exists) continue;
    if (await currentBoost(now)) continue;
    const startsAt = occ.start > now ? occ.start : now;
    const [row] = await db
      .insert(wagerBoosts)
      .values({ multiplier: s.multiplier, startsAt, endsAt: occ.end, scheduleId: s.id, occurrenceKey: occ.key, createdBy: s.createdBy })
      .onConflictDoNothing()
      .returning();
    if (!row) continue;
    made++;
    await audit(null, 'boost.scheduled_window', 'wager_boost', row.id, null, row);
    if (row.startsAt.getTime() > now.getTime() + 60_000) await postTeaser(row);
  }
  return made;
}

/* ------------------------------------------------------- Discord #leaderboard */

/** Posts are skipped (but marked done) if the moment is this old, e.g. after downtime. */
const STALE_POST_MS = 15 * 60_000;

/** Same as `siteUrl` in `@/lib/env`, which is server-only and can't load under the tsx sync CLI. */
const siteUrl = (path: string) => new URL(path, process.env.APP_URL?.trim() || 'http://localhost:3000').toString();
const unix = (d: Date) => Math.floor(d.getTime() / 1000);
const lengthText = (ms: number) => {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} minutes`;
  return min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} hour${min === 60 ? '' : 's'}`;
};

/** Post to the Discord #leaderboard channel (the standings webhook). False when no webhook is set. */
async function postToLeaderboardChannel(content: string) {
  const url = process.env.DISCORD_LEADERBOARD_WEBHOOK_URL?.trim();
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
  return true;
}

export function teaserMessage(b: WagerBoost) {
  const end = boostEnd(b);
  const length = end ? ` and runs ${lengthText(end.getTime() - b.startsAt.getTime())}` : '';
  return `⏰ **${boostLabel(b.multiplier)}** starts <t:${unix(b.startsAt)}:R> (<t:${unix(b.startsAt)}:t>)${length}: every wager under code **STZY** will count **${b.multiplier}×** on the leaderboard.\n${siteUrl('/leaderboard')}`;
}

export function startMessage(b: WagerBoost) {
  const end = boostEnd(b);
  const until = end ? ` until <t:${unix(end)}:t> (ends <t:${unix(end)}:R>)` : ' for a limited time';
  return `🔥 **${boostLabel(b.multiplier).toUpperCase()} IS LIVE!** Every wager under code **STZY** counts **${b.multiplier}×** on the leaderboard${until}. Start wagering now!\n${siteUrl('/leaderboard')}`;
}

export function endMessage(b: WagerBoost) {
  return `⏹️ **${boostLabel(b.multiplier)} is over.** Wagers count normally again; the boosted wagers land on the leaderboard within about 10 minutes.\n${siteUrl('/leaderboard')}`;
}

async function postTeaser(b: WagerBoost) {
  await postToLeaderboardChannel(teaserMessage(b)).catch((error) => console.warn('[boost] Discord teaser failed', error));
}

/** Post "it's live" / "it's over" for boosts that just crossed either line. Returns how many posts went out. */
export async function announceBoosts(now = new Date()) {
  if (!process.env.DISCORD_LEADERBOARD_WEBHOOK_URL?.trim()) return 0;
  const pending = await db
    .select()
    .from(wagerBoosts)
    .where(
      and(
        lte(wagerBoosts.startsAt, now),
        or(isNull(wagerBoosts.announcedStartAt), isNull(wagerBoosts.announcedEndAt)),
        gte(wagerBoosts.createdAt, new Date(now.getTime() - 14 * DAY_MS)),
      ),
    );
  let posted = 0;
  for (const b of pending) {
    const state = boostState(b, now);
    const end = boostEnd(b);
    if (!b.announcedStartAt) {
      if (state === 'ended') {
        // Never announced as started (e.g. turned off within seconds): no start or end post.
        await db.update(wagerBoosts).set({ announcedStartAt: now, announcedEndAt: now }).where(eq(wagerBoosts.id, b.id));
        continue;
      }
      const fresh = now.getTime() - b.startsAt.getTime() < STALE_POST_MS;
      if (fresh && (await postToLeaderboardChannel(startMessage(b)))) posted++;
      await db.update(wagerBoosts).set({ announcedStartAt: now }).where(eq(wagerBoosts.id, b.id));
      continue;
    }
    if (state === 'ended' && !b.announcedEndAt) {
      if (end && now.getTime() - end.getTime() < STALE_POST_MS && (await postToLeaderboardChannel(endMessage(b)))) posted++;
      await db.update(wagerBoosts).set({ announcedEndAt: now }).where(eq(wagerBoosts.id, b.id));
    }
  }
  return posted;
}
