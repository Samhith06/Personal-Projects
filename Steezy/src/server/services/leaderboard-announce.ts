/**
 * Overtake posts for the Discord #leaderboard channel.
 *
 * After each wager sync we compare the live board's top places with the order
 * we last announced (kept in `sync_state` under `leaderboard-announce:<id>`)
 * and post one message listing every climb, e.g. "Matt**** passed Jose**** and
 * is now 4th". The first look at a board only records the order, so a deploy
 * or a new board doesn't flood the channel. Names stay masked, as on the site.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { syncState } from '@/server/db/schema';
import { formatUsd, metricLabel, ordinal } from '@/lib/format';
import { currentLeaderboard, getStandings, type Standing } from './leaderboards';

/** Places we watch: the paid places, but at least this many. */
const MIN_TRACKED = 10;

/** Roobet uids in rank order, and the masked name shown for each. */
type Snapshot = { order: string[]; names: string[] };

const stateKey = (boardId: string) => `leaderboard-announce:${boardId}`;

/** `Matt****` would turn bold in Discord; escape markdown characters. */
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

async function post(url: string, content: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
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
