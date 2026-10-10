/**
 * Guess the balance from Kick chat.
 *
 * Once collecting is done the streamer opens guessing, and viewers type
 * `!guess 1234` (also `!guess $1,234.50` or `!guess 1.2k`) for what they think
 * the bonuses will pay back in total. Guessing again while it is open replaces
 * the guess; once the streamer closes it to start opening, guesses are locked.
 *
 * Chat reaches this through `hunt-chat.ts`.
 */
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { bonusHuntGuesses } from '@/server/db/schema';
import type { ChatMessage } from './chat-verification';
import { channelHuntAt } from './slot-calls';

const GUESS_PATTERN = /^!guess\s+\$?\s*([\d,]*\.?\d+)\s*(k)?\s*$/i;
/** No hunt pays this back; anything above is a joke or a typo. */
const MAX_GUESS = 10_000_000;
const MAX_GUESSES_PER_HUNT = 5_000;

export const looksLikeGuess = (content: string) => /^!guess\b/i.test(content.trim());

/** The amount in a `!guess`, or null when it isn't a usable number. */
export function parseGuess(content: string): number | null {
  const match = GUESS_PATTERN.exec(content.trim());
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, '')) * (match[2] ? 1000 : 1);
  if (!Number.isFinite(n) || n < 0 || n > MAX_GUESS) return null;
  return Math.round(n * 100) / 100;
}

/** Returns true when the message was taken as a guess. */
export async function handleGuess(msg: ChatMessage): Promise<boolean> {
  const guess = parseGuess(msg.content);
  if (guess === null) return false;

  const hunt = await channelHuntAt(msg.channel, 'guessing');
  if (!hunt) return false;

  const [existing] = await db
    .select({ id: bonusHuntGuesses.id })
    .from(bonusHuntGuesses)
    .where(and(eq(bonusHuntGuesses.huntId, hunt.id), eq(bonusHuntGuesses.kickUserId, msg.senderId)))
    .limit(1);

  if (existing) {
    await db
      .update(bonusHuntGuesses)
      .set({ guess, kickUsername: msg.senderUsername, guessedAt: new Date() })
      .where(eq(bonusHuntGuesses.id, existing.id));
    return true;
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(bonusHuntGuesses)
    .where(eq(bonusHuntGuesses.huntId, hunt.id));
  if (Number(n) >= MAX_GUESSES_PER_HUNT) return false;

  await db
    .insert(bonusHuntGuesses)
    .values({
      id: `bhg-${crypto.randomUUID().slice(0, 8)}`,
      huntId: hunt.id,
      kickUserId: msg.senderId,
      kickUsername: msg.senderUsername,
      guess,
    })
    // Two deliveries of the same message (watcher and webhook both live) race here.
    .onConflictDoNothing();
  return true;
}
