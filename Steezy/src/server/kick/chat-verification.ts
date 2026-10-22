/**
 * Kick chat-code verification (adapted from FTDWEBSITE).
 *
 * A signed-in member asks for a code and sends `!verify CODE` in Steezy's Kick
 * chat. The Kick identity that gets linked is the *sender of that message* —
 * supplied by Kick, never typed by the member. Codes expire after 10 minutes
 * and are only ever shown to the member who requested them.
 */
import { randomInt } from 'node:crypto';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { kickVerifications } from '@/server/db/schema';
import { linkKickAccount } from '@/server/auth/kick';

export const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODES_PER_HOUR = 5;

// No 0/O/1/I/L — codes are read off a screen and typed into chat.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const VERIFY_PATTERN = /^!verify\s+([A-HJ-KMNP-Z2-9]{5})\b/i;

function newCode() {
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export type StartResult = { ok: true; code: string; expiresAt: Date } | { ok: false; message: string };

export async function startVerification(userId: string): Promise<StartResult> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(kickVerifications)
    .where(and(eq(kickVerifications.userId, userId), gt(kickVerifications.createdAt, hourAgo)));
  if (recent >= MAX_CODES_PER_HOUR) {
    return { ok: false, message: 'Too many codes requested. Wait a little while and try again.' };
  }

  // One live code per member.
  await db
    .update(kickVerifications)
    .set({ status: 'cancelled' })
    .where(and(eq(kickVerifications.userId, userId), eq(kickVerifications.status, 'pending')));

  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  const code = newCode();
  await db.insert(kickVerifications).values({ userId, code, expiresAt });
  return { ok: true, code, expiresAt };
}

/** The member's most recent attempt, expiring stale ones on read. */
export async function latestVerification(userId: string) {
  await db
    .update(kickVerifications)
    .set({ status: 'expired' })
    .where(and(eq(kickVerifications.status, 'pending'), lt(kickVerifications.expiresAt, new Date())));

  const [row] = await db
    .select()
    .from(kickVerifications)
    .where(eq(kickVerifications.userId, userId))
    .orderBy(desc(kickVerifications.createdAt))
    .limit(1);
  return row ?? null;
}

export type ChatMessage = { senderId: string; senderUsername: string; content: string };

/** Returns true when the message redeemed a code. */
export async function handleVerifyCommand(msg: ChatMessage): Promise<boolean> {
  const match = VERIFY_PATTERN.exec(msg.content.trim());
  if (!match) return false;
  const code = match[1].toUpperCase();

  const [pending] = await db
    .select()
    .from(kickVerifications)
    .where(
      and(eq(kickVerifications.code, code), eq(kickVerifications.status, 'pending'), gt(kickVerifications.expiresAt, new Date())),
    )
    .limit(1);
  if (!pending) return false;

  const result = await linkKickAccount(pending.userId, { userId: msg.senderId, username: msg.senderUsername }, 'chat');
  const now = new Date();
  await db
    .update(kickVerifications)
    .set(
      result === 'linked'
        ? { status: 'verified', verifiedAt: now, matchedKickUserId: msg.senderId }
        : { status: 'expired', failureReason: 'already_linked', matchedKickUserId: msg.senderId },
    )
    .where(eq(kickVerifications.id, pending.id));

  if (result === 'linked') console.info(`[kick-verify] linked @${msg.senderUsername}`);
  return result === 'linked';
}
