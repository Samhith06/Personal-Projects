/**
 * Records chat activity during a live session and keeps `watch_time` rolled up.
 *
 * Every chatter is recorded by Kick user id, linked or not, so someone who
 * links their Kick account later gets credit for the streams they already
 * chatted in (`recomputeForKickUser`).
 */
import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { chatActivity, users, watchTime } from '@/server/db/schema';
import { isCounted, normaliseMessage, watchSeconds } from '@/lib/watchtime';

export type ChatEvent = {
  messageId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  at: Date;
};

const hashOf = (content: string) => createHash('sha256').update(normaliseMessage(content)).digest('hex');

/** Store one chat message against the open session. Returns null for a duplicate delivery. */
export async function recordChat(sessionId: string, msg: ChatEvent) {
  const contentHash = hashOf(msg.content);
  const recent = await db
    .select({ at: chatActivity.at, contentHash: chatActivity.contentHash, counted: chatActivity.counted })
    .from(chatActivity)
    .where(and(eq(chatActivity.sessionId, sessionId), eq(chatActivity.kickUserId, msg.senderId)))
    .orderBy(desc(chatActivity.at))
    .limit(20);
  const previous = recent[0] ?? null;
  const lastCountedAt = recent.find((r) => r.counted)?.at ?? null;
  const counted = isCounted(msg.content, contentHash, msg.at, previous, lastCountedAt);

  const inserted = await db
    .insert(chatActivity)
    .values({
      sessionId,
      kickMessageId: msg.messageId,
      kickUserId: msg.senderId,
      kickUsername: msg.senderUsername,
      at: msg.at,
      contentHash,
      counted,
    })
    .onConflictDoNothing()
    .returning({ id: chatActivity.id });
  if (!inserted.length) return null;

  if (counted) await recomputeWatchTime(sessionId, msg.senderId);
  return { counted };
}

/** Rebuild one member's watch time for one session from stored chat. No-op if the Kick account isn't linked. */
export async function recomputeWatchTime(sessionId: string, kickUserId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.kickUserId, kickUserId)).limit(1);
  if (!user) return;

  const rows = await db
    .select({ at: chatActivity.at, counted: chatActivity.counted })
    .from(chatActivity)
    .where(and(eq(chatActivity.sessionId, sessionId), eq(chatActivity.kickUserId, kickUserId)));
  const minutes = Math.round(watchSeconds(rows.filter((r) => r.counted).map((r) => r.at)) / 60);

  await db
    .insert(watchTime)
    .values({ sessionId, userId: user.id, minutes, messages: rows.length })
    .onConflictDoUpdate({ target: [watchTime.sessionId, watchTime.userId], set: { minutes, messages: rows.length } });
}

/** After a member links Kick: credit every past session they chatted in. */
export async function recomputeForKickUser(kickUserId: string) {
  const sessions = await db
    .selectDistinct({ sessionId: chatActivity.sessionId })
    .from(chatActivity)
    .where(eq(chatActivity.kickUserId, kickUserId));
  for (const s of sessions) await recomputeWatchTime(s.sessionId, kickUserId);
  return sessions.length;
}

/** Totals for the chat bot and profile. */
export async function watchTotals(userId: string) {
  const [row] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${watchTime.minutes}), 0)::int`,
      streams: sql<number>`count(*) filter (where ${watchTime.minutes} > 0)::int`,
    })
    .from(watchTime)
    .where(eq(watchTime.userId, userId));
  return row;
}
