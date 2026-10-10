/**
 * Kick chat-code verification.
 *
 * A member asks for a one-time code, then posts it in any FGDR creator's Kick
 * chat. Whatever delivers chat messages (the live chat watcher, or Kick's
 * official webhooks) calls `handleChatMessage`. The Kick identity that gets
 * linked is the *sender of the chat message* — supplied by Kick, never typed
 * by the member — and it must match the username they declared up front, so a
 * code copied off someone's screen is useless to anyone else.
 */
import 'server-only';
import { randomInt } from 'node:crypto';
import { and, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { kickVerifications, users } from '@/server/db/schema';

export const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODES_PER_HOUR = 5;

// No 0/O/1/I/L — codes are read off a screen and typed into chat.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /\bFGDR-([A-HJ-KMNP-Z2-9]{5})\b/i;

function newCode() {
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `FGDR-${out}`;
}

export type StartResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; message: string };

export async function startVerification(userId: string, kickUsername: string): Promise<StartResult> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)` })
    .from(kickVerifications)
    .where(and(eq(kickVerifications.userId, userId), gt(kickVerifications.createdAt, hourAgo)));
  if (Number(recent) >= MAX_CODES_PER_HOUR) {
    return { ok: false, message: 'Too many codes requested. Please wait a little while and try again.' };
  }

  // Only one live code per member.
  await db
    .update(kickVerifications)
    .set({ status: 'cancelled' })
    .where(and(eq(kickVerifications.userId, userId), eq(kickVerifications.status, 'pending')));

  let code = newCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db
      .select({ id: kickVerifications.id })
      .from(kickVerifications)
      .where(and(eq(kickVerifications.code, code), eq(kickVerifications.status, 'pending')))
      .limit(1);
    if (!clash) break;
    code = newCode();
  }

  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  await db.insert(kickVerifications).values({
    id: `kv_${crypto.randomUUID()}`,
    userId,
    code,
    expectedUsername: kickUsername.toLowerCase(),
    expiresAt,
  });

  return { ok: true, code, expiresAt };
}

export async function cancelVerification(userId: string) {
  await db
    .update(kickVerifications)
    .set({ status: 'cancelled' })
    .where(and(eq(kickVerifications.userId, userId), eq(kickVerifications.status, 'pending')));
}

/** The member's most recent verification attempt (expiring stale ones on read). */
export async function latestVerification(userId: string) {
  await db
    .update(kickVerifications)
    .set({ status: 'expired' })
    .where(and(eq(kickVerifications.status, 'pending'), lt(kickVerifications.expiresAt, new Date())));

  const [row] = await db
    .select()
    .from(kickVerifications)
    .where(eq(kickVerifications.userId, userId))
    .orderBy(sql`${kickVerifications.createdAt} desc`)
    .limit(1);
  return row ?? null;
}

export async function hasPendingVerifications() {
  const [row] = await db
    .select({ id: kickVerifications.id })
    .from(kickVerifications)
    .where(and(eq(kickVerifications.status, 'pending'), gt(kickVerifications.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
}

export type ChatMessage = {
  channel: string;
  senderId: string;
  senderUsername: string;
  content: string;
};

/** Returns true when the message redeemed a code. */
export async function handleChatMessage(msg: ChatMessage): Promise<boolean> {
  const match = CODE_PATTERN.exec(msg.content);
  if (!match) return false;
  const code = `FGDR-${match[1].toUpperCase()}`;

  const [pending] = await db
    .select()
    .from(kickVerifications)
    .where(
      and(
        eq(kickVerifications.code, code),
        eq(kickVerifications.status, 'pending'),
        gt(kickVerifications.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!pending) return false;

  // Someone else posted this member's code — ignore it, keep the code alive.
  if (msg.senderUsername.toLowerCase() !== pending.expectedUsername) {
    console.warn(`[kick-verify] ${code} posted by @${msg.senderUsername}, expected @${pending.expectedUsername}; ignored`);
    return false;
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.kickUserId, msg.senderId), ne(users.id, pending.userId)))
    .limit(1);
  if (taken) {
    await db
      .update(kickVerifications)
      .set({ status: 'expired', failureReason: 'already_linked' })
      .where(eq(kickVerifications.id, pending.id));
    return false;
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      kickUserId: msg.senderId,
      kickUsername: msg.senderUsername,
      kickVerified: true,
      kickLinkedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, pending.userId));

  await db
    .update(kickVerifications)
    .set({ status: 'verified', verifiedAt: now, matchedKickUserId: msg.senderId, matchedChannel: msg.channel })
    .where(eq(kickVerifications.id, pending.id));

  console.info(`[kick-verify] linked @${msg.senderUsername} via ${msg.channel} chat`);
  return true;
}
