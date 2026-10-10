/**
 * Bonus hunt commands in Kick chat: `!sr <slot>` while a hunt is collecting,
 * `!guess <final balance>` while it is taking guesses.
 *
 * Both chat routes (the live chat watcher and Kick's official webhooks) hand
 * every message here, the same way they hand codes to the verification handler.
 */
import 'server-only';
import { inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { bonusHunts } from '@/server/db/schema';
import type { ChatMessage } from './chat-verification';
import { handleGuess, looksLikeGuess } from './guesses';
import { handleSlotCall, looksLikeSlotCall } from './slot-calls';

/** Cheap check the watcher uses before touching the database. */
export const looksLikeHuntCommand = (content: string) => looksLikeSlotCall(content) || looksLikeGuess(content);

export async function handleHuntChat(msg: ChatMessage): Promise<boolean> {
  if (looksLikeSlotCall(msg.content)) return handleSlotCall(msg);
  if (looksLikeGuess(msg.content)) return handleGuess(msg);
  return false;
}

/** Is any hunt at a step where chat commands count? The watcher stays connected while one is. */
export async function hasHuntReadingChat() {
  const [row] = await db
    .select({ id: bonusHunts.id })
    .from(bonusHunts)
    .where(inArray(bonusHunts.status, ['collecting', 'guessing']))
    .limit(1);
  return Boolean(row);
}
