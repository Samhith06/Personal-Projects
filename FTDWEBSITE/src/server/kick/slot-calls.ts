/**
 * Slot calls from Kick chat.
 *
 * While a hunt is collecting, a viewer in that creator's chat types
 * `!sr Sugar Rush 1000`. The call waits in the admin queue until the streamer
 * says whether they got a bonus on it — and if so, on what bet and which kind.
 * Nothing a viewer types lands on the public board by itself.
 *
 * Chat reaches this through `hunt-chat.ts`. The caller is the message's
 * sender as Kick delivered it.
 */
import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { bonusHuntCalls, bonusHunts, streamers } from '@/server/db/schema';
import type { ChatMessage } from './chat-verification';

const CALL_PATTERN = /^!sr\s+(.+)$/i;
/** A flood of calls should not be able to grow the table without bound. */
const MAX_CALLS_PER_HUNT = 300;

/** Cheap check the watcher uses before touching the database. */
export const looksLikeSlotCall = (content: string) => CALL_PATTERN.test(content.trim());

/** The hunt a channel is running at a given step, if any. Chat is matched to it by Kick channel. */
export async function channelHuntAt(channel: string, status: 'collecting' | 'guessing') {
  const [row] = await db
    .select({ id: bonusHunts.id })
    .from(bonusHunts)
    .innerJoin(streamers, eq(streamers.id, bonusHunts.streamerId))
    .where(and(eq(bonusHunts.status, status), sql`lower(${streamers.kickUsername}) = ${channel.toLowerCase()}`))
    .orderBy(desc(bonusHunts.startedAt))
    .limit(1);
  return row ?? null;
}

/** Returns true when the message was taken as a call. */
export async function handleSlotCall(msg: ChatMessage): Promise<boolean> {
  const match = CALL_PATTERN.exec(msg.content.trim());
  if (!match) return false;
  // Collapse runs of spaces and strip emotes' bracket syntax; keep it to a sane length.
  const game = match[1].replace(/\[emote:[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (game.length < 2) return false;

  const hunt = await channelHuntAt(msg.channel, 'collecting');
  if (!hunt) return false;

  const [existing] = await db
    .select()
    .from(bonusHuntCalls)
    .where(and(eq(bonusHuntCalls.huntId, hunt.id), eq(bonusHuntCalls.kickUserId, msg.senderId)))
    .limit(1);

  if (existing) {
    // Calling again corrects a typo — but once the streamer has ruled on it, it stands.
    if (existing.status !== 'pending') return false;
    await db
      .update(bonusHuntCalls)
      .set({ game, kickUsername: msg.senderUsername, createdAt: new Date() })
      .where(eq(bonusHuntCalls.id, existing.id));
    return true;
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(bonusHuntCalls)
    .where(eq(bonusHuntCalls.huntId, hunt.id));
  if (Number(n) >= MAX_CALLS_PER_HUNT) return false;

  await db
    .insert(bonusHuntCalls)
    .values({
      id: `bhc-${crypto.randomUUID().slice(0, 8)}`,
      huntId: hunt.id,
      kickUserId: msg.senderId,
      kickUsername: msg.senderUsername,
      game,
    })
    // Two deliveries of the same message (watcher and webhook both live) race here.
    .onConflictDoNothing();
  return true;
}
