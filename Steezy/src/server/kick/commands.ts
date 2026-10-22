/**
 * Chat bot commands: !wager, !rank, !watchtime, !link.
 *
 * Cooldowns keep chat readable: each viewer can use a command once per
 * USER_COOLDOWN_MS, and each command answers at most once per GLOBAL_COOLDOWN_MS.
 * They live in process memory, which is fine for one server instance.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { formatMinutes, formatUsd, ordinal } from '@/lib/format';
import { currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { approvedRoobetUid, wagerTotalFor, type Metric } from '@/server/services/wagers';
import { watchTotals } from './watchtime';

export const COMMANDS = ['wager', 'rank', 'watchtime', 'link'] as const;
export type Command = (typeof COMMANDS)[number];

const USER_COOLDOWN_MS = 30_000;
const GLOBAL_COOLDOWN_MS = 3_000;

const COMMAND_PATTERN = /^!(wager|rank|watchtime|link)\b/i;

export function parseCommand(content: string): Command | null {
  const m = COMMAND_PATTERN.exec(content.trim());
  return m ? (m[1].toLowerCase() as Command) : null;
}

const g = globalThis as unknown as { steezyCooldowns?: Map<string, number> };
const cooldowns = (g.steezyCooldowns ??= new Map());

/** True (and the cooldown is started) when this use may be answered. */
export function takeCooldown(command: Command, kickUserId: string, now = Date.now()) {
  const userKey = `${command}:${kickUserId}`;
  const globalKey = `${command}:*`;
  if ((cooldowns.get(userKey) ?? 0) > now || (cooldowns.get(globalKey) ?? 0) > now) return false;
  cooldowns.set(userKey, now + USER_COOLDOWN_MS);
  cooldowns.set(globalKey, now + GLOBAL_COOLDOWN_MS);
  if (cooldowns.size > 5000) for (const [k, until] of cooldowns) if (until <= now) cooldowns.delete(k);
  return true;
}

const linkUrl = () => `${(process.env.APP_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '')}/me/link`;

/** The reply text for a command, without the @mention. */
export async function replyFor(command: Command, kickUserId: string): Promise<string> {
  const [member] = await db
    .select({ id: users.id, blocked: users.blockedFromRewards })
    .from(users)
    .where(eq(users.kickUserId, kickUserId))
    .limit(1);

  if (command === 'link') {
    if (!member) return `link your Kick and Roobet accounts at ${linkUrl()}`;
    const uid = await approvedRoobetUid(member.id);
    return uid ? 'you’re all set — Kick and Roobet are both linked.' : `Kick is linked. Add your Roobet username at ${linkUrl()}`;
  }

  if (!member) return `link your Kick account first: ${linkUrl()}`;

  if (command === 'watchtime') {
    const t = await watchTotals(member.id);
    return t.minutes
      ? `${formatMinutes(t.minutes)} watched across ${t.streams} stream${t.streams === 1 ? '' : 's'}.`
      : 'no watch time yet — it counts while you chat during the stream.';
  }

  const uid = await approvedRoobetUid(member.id);
  if (!uid) return `your Roobet username isn’t linked yet: ${linkUrl()}`;

  const board = await currentLeaderboard();

  if (command === 'wager') {
    const lifetime = await wagerTotalFor(uid, null);
    if (!board) return `${formatUsd(lifetime)} wagered lifetime under code STZY.`;
    const period = await wagerTotalFor(uid, board.startsAt, board.endsAt, board.metric as Metric);
    return `${formatUsd(period)} wagered on the ${board.name} leaderboard · ${formatUsd(lifetime)} lifetime.`;
  }

  // rank
  if (!board) return 'no leaderboard is running right now.';
  const standings = await getStandings(board);
  const i = standings.findIndex((s) => s.roobetUid === uid);
  if (i < 0) return `not on the ${board.name} leaderboard yet — wager under code STZY to get on it.`;
  const me = standings[i];
  const ahead = i > 0 ? ` · ${formatUsd(standings[i - 1].wagered - me.wagered)} behind ${ordinal(i)}` : '';
  return `${ordinal(me.rank)} on the ${board.name} leaderboard with ${formatUsd(me.wagered)}${ahead}.`;
}
