/**
 * Overtake posts for the Discord #leaderboard channel.
 *
 * After each wager sync we compare the live board's top places with the order
 * we last announced (kept in `sync_state` under `leaderboard-announce:<id>`)
 * and post one message listing every climb, e.g. "Ma**ins passed Jo**ito and
 * is now 4th". The first look at a board only records the order, so a deploy
 * or a new board doesn't flood the channel. Names stay masked, as on the site.
 * Once a day it also posts the board's current top places.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { syncState } from '@/server/db/schema';
import { formatUsd, metricLabel, ordinal } from '@/lib/format';
import { siteUrl } from '@/lib/env';
import { currentLeaderboard, getStandings, type Standing } from './leaderboards';

/** Places we watch: the paid places, but at least this many. */
const MIN_TRACKED = 10;

/** Roobet uids in rank order, and the masked name shown for each. */
type Snapshot = { order: string[]; names: string[] };

const stateKey = (boardId: string) => `leaderboard-announce:${boardId}`;

/** `Ma**ins` would turn bold in Discord; escape markdown characters. */
const md = (name: string) => name.replace(/[\\*_~`|>]/g, (c) => `\\${c}`);

function joinNames(names: string[]) {
  const bold = names.map((n) => `**${md(n)}**`);
  return bold.length <= 1 ? bold.join('') : `${bold.slice(0, -1).join(', ')} and ${bold[bold.length - 1]}`;
}

/** One line per player who climbed past someone, best new place first. */
export function overtakeLines(prev: Snapshot, after: Standing[], label: string) {
  const before = prev.order;
  const oldRank = new Map(before.map((uid, i) => [uid, i]));
  const newRank = new Map(after.map((s, i) => [s.roobetUid, i]));
  const lines: string[] = [];

  after.forEach((s, i) => {
    const was = oldRank.get(s.roobetUid) ?? Infinity;
    if (i >= was) return;
    // Everyone who was ahead before and is behind now.
    const passed = before.filter((uid, j) => j < was && (newRank.get(uid) ?? Infinity) > i);
    if (!passed.length) return;
    const names = passed.map((uid) => prev.names[before.indexOf(uid)] ?? 'someone');
    lines.push(
      `📈 **${md(s.displayName)}** just passed ${joinNames(names)} and is now **${ordinal(s.rank)}** with ${formatUsd(s.wagered)} ${label}.`,
    );
  });
  return lines;
}

/** Plain text, or a full webhook body (e.g. with embeds). */
async function post(url: string, message: string | Record<string, unknown>) {
  const body = typeof message === 'string' ? { content: message } : message;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
}

/** Post any overtakes on the live board since the last check. Returns how many climbs were announced. */
export async function announceLeaderboardChanges(): Promise<number> {
  const url = process.env.DISCORD_LEADERBOARD_WEBHOOK_URL?.trim();
  if (!url) return 0;
  const board = await currentLeaderboard();
  if (!board || board.status !== 'live') return 0;

  const tracked = Math.max(MIN_TRACKED, board.prizes.length);
  const top = (await getStandings(board)).slice(0, tracked);
  const snapshot: Snapshot = { order: top.map((s) => s.roobetUid), names: top.map((s) => s.displayName) };

  const key = stateKey(board.id);
  const [row] = await db.select({ detail: syncState.detail }).from(syncState).where(eq(syncState.key, key)).limit(1);
  const before = row?.detail as Snapshot | null;

  const lines = before?.order && before.names ? overtakeLines(before, top, metricLabel(board.metric)) : [];
  if (lines.length) {
    // Discord caps a message at 2000 characters.
    let chunk = `🏁 **${md(board.name)}** leaderboard update`;
    for (const line of lines) {
      if (chunk.length + line.length + 1 > 1900) {
        await post(url, chunk);
        chunk = '';
      }
      chunk += `${chunk ? '\n' : ''}${line}`;
    }
    if (chunk) await post(url, chunk);
  }

  // Only remember the new order once it's been announced, so a failed post is retried next run.
  const now = new Date();
  await db
    .insert(syncState)
    .values({ key, lastRunAt: now, lastOkAt: now, detail: snapshot })
    .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastOkAt: now, detail: snapshot } });
  return lines.length;
}

/** UTC hour after which the daily standings go out (default 18:00 UTC). */
const dailyHour = () => {
  const h = Number(process.env.LEADERBOARD_DAILY_HOUR_UTC ?? 18);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 18;
};

const MEDALS = ['🥇', '🥈', '🥉'];

/** Embed colour: the site accent green. */
const ACCENT = 0x4fd08a;

const unix = (d: Date) => Math.floor(d.getTime() / 1000);

/**
 * The standings card: three players per row (Discord inline fields), medals
 * for the podium, wager and prize under each name. `<t:…>` timestamps show
 * in each reader's own time zone.
 */
function standingsEmbed(board: { name: string; metric: string; endsAt: Date }, top: Standing[], now: Date) {
  const label = metricLabel(board.metric);
  return {
    embeds: [
      {
        title: `📊 Live Leaderboard — Top ${top.length}`,
        url: siteUrl('/leaderboard'),
        color: ACCENT,
        description: `**${md(board.name)}** · updated <t:${unix(now)}:f> · ends <t:${unix(board.endsAt)}:R>
Ranked by ${label}.`,
        fields: top.map((s) => ({
          name: `${MEDALS[s.rank - 1] ?? `#${s.rank}`} ${md(s.displayName)}`,
          value: `${formatUsd(s.wagered)}${s.prize ? `
🏆 ${formatUsd(s.prize)}` : ''}`,
          inline: true,
        })),
        footer: { text: 'SteezySpins Leaderboard' },
        timestamp: now.toISOString(),
      },
    ],
  };
}

/** Post the live board's top places now. Returns false when there's no webhook, no live board or no wagers yet. */
export async function postStandings(now = new Date()): Promise<boolean> {
  const url = process.env.DISCORD_LEADERBOARD_WEBHOOK_URL?.trim();
  if (!url) return false;
  const board = await currentLeaderboard();
  if (!board || board.status !== 'live') return false;
  const top = (await getStandings(board)).filter((s) => s.wagered > 0).slice(0, Math.max(MIN_TRACKED, board.prizes.length));
  if (!top.length) return false;
  await post(url, standingsEmbed(board, top, now));
  return true;
}

/**
 * Once a day, after LEADERBOARD_DAILY_HOUR_UTC, post the live board's top
 * places. The last posted day is kept in `sync_state` so restarts and the
 * 10-minute sync loop don't post twice. Returns true when a post went out.
 */
export async function postDailyStandings(now = new Date()): Promise<boolean> {
  const url = process.env.DISCORD_LEADERBOARD_WEBHOOK_URL?.trim();
  if (!url || now.getUTCHours() < dailyHour()) return false;
  const board = await currentLeaderboard();
  if (!board || board.status !== 'live') return false;

  const day = now.toISOString().slice(0, 10);
  // v2: the embed format. Bumping the key lets the first run after that change post once in the new style.
  const key = `leaderboard-daily:v2:${board.id}`;
  const [row] = await db.select({ detail: syncState.detail }).from(syncState).where(eq(syncState.key, key)).limit(1);
  if ((row?.detail as { day?: string } | null)?.day === day) return false;

  const posted = await postStandings(now);

  // Mark the day done even when nobody has wagered yet, so an empty board isn't re-checked all evening.
  await db
    .insert(syncState)
    .values({ key, lastRunAt: now, lastOkAt: now, detail: { day } })
    .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastOkAt: now, detail: { day } } });
  return posted;
}
