'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { challengeEntries, challenges, raffleEntries, raffles, users } from '@/server/db/schema';
import { getCurrentUser, needsAgeConfirmation } from '@/server/auth/session';
import { cancelVerification, startVerification } from '@/server/kick/chat-verification';
import { ensureChatWatcher } from '@/server/kick/chat-watcher';

export type ActionState = { ok: boolean; message: string } | null;
export type KickCodeState = { ok: boolean; message: string; code?: string; expiresAt?: string; kickUsername?: string } | null;

const fail = (message: string): ActionState => ({ ok: false, message });
const done = (message: string): ActionState => ({ ok: true, message });

/* ------------------------------------------------------------ Stake username */

const stakeSchema = z
  .string()
  .trim()
  .max(32, 'Stake usernames are 32 characters or fewer.')
  .regex(/^[A-Za-z0-9_.-]*$/, 'Use letters, numbers, dots, dashes or underscores only.');

/**
 * A member can hold one account on each Stake site — they are separate
 * accounts, and each feeds its own leaderboard.
 */
async function saveStakeAccount(form: FormData, field: 'stakeUsername' | 'stakeEuUsername', site: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail('Please sign in again.');

  const parsed = stakeSchema.safeParse(form.get(field) ?? '');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid username.');

  const value = parsed.data || null;
  await db.update(users).set({ [field]: value, updatedAt: new Date() }).where(eq(users.id, user.id));

  revalidatePath('/account');
  revalidatePath('/dashboard');
  return done(value ? `${site} username saved. It stays private to you and the FGDR team.` : `${site} username removed.`);
}

export async function saveStakeUsername(_prev: ActionState, form: FormData): Promise<ActionState> {
  return saveStakeAccount(form, 'stakeUsername', 'Stake.com');
}

export async function saveStakeEuUsername(_prev: ActionState, form: FormData): Promise<ActionState> {
  return saveStakeAccount(form, 'stakeEuUsername', 'Stake.eu');
}

/* ------------------------------------------------------------------ Kick link */

const kickSchema = z
  .string()
  .trim()
  .min(3, 'Kick usernames are at least 3 characters.')
  .max(25, 'Kick usernames are 25 characters or fewer.')
  .regex(/^[A-Za-z0-9_]+$/, 'Kick usernames use letters, numbers and underscores only.');

/** Issue a one-time chat code for linking Kick without OAuth. */
export async function requestKickChatCode(
  _prev: KickCodeState,
  form: FormData,
): Promise<KickCodeState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Please sign in again.' };
  if (user.kickVerified) return { ok: false, message: 'Your Kick account is already verified.' };

  const parsed = kickSchema.safeParse(form.get('kickUsername') ?? '');
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid username.' };

  const result = await startVerification(user.id, parsed.data);
  if (!result.ok) return result;

  await ensureChatWatcher();
  return { ok: true, message: 'Code ready', code: result.code, expiresAt: result.expiresAt.toISOString(), kickUsername: parsed.data };
}

export async function cancelKickChatCode(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await cancelVerification(user.id);
}

export async function unlinkKick(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .update(users)
    .set({ kickUsername: null, kickUserId: null, kickVerified: false, kickLinkedAt: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  revalidatePath('/account');
  revalidatePath('/dashboard');
}

/* -------------------------------------------------------------------- Raffles */

export async function enterRaffle(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail('Sign in with Discord to enter.');
  if (await needsAgeConfirmation(user)) return fail('Please confirm you are 18 or older first.');

  const raffleId = String(form.get('raffleId') ?? '');
  const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
  if (!raffle) return fail('That raffle no longer exists.');

  const now = Date.now();
  if (raffle.status !== 'active' || raffle.endsAt.getTime() < now || raffle.startsAt.getTime() > now) {
    return fail('This raffle is not open for entries.');
  }
  if (!user.kickVerified) return fail('Link and verify your Kick account first — entries are tied to it.');

  // Eligibility against the raffle's requirement is verified by staff before
  // the draw; entering records intent and prevents duplicates.
  const inserted = await db
    .insert(raffleEntries)
    .values({ id: `re_${crypto.randomUUID()}`, raffleId, userId: user.id })
    .onConflictDoNothing()
    .returning({ id: raffleEntries.id });

  if (!inserted.length) return done('You’re already entered.');

  await db
    .update(raffles)
    .set({ entries: sql`${raffles.entries} + 1` })
    .where(eq(raffles.id, raffleId));

  revalidatePath('/raffles');
  revalidatePath('/dashboard');
  return done('You’re in. Good luck — winners are drawn live on stream.');
}

/* ----------------------------------------------------------------- Challenges */

export async function joinChallenge(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail('Sign in with Discord to join.');
  if (await needsAgeConfirmation(user)) return fail('Please confirm you are 18 or older first.');

  const challengeId = String(form.get('challengeId') ?? '');
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge) return fail('That challenge no longer exists.');
  if (challenge.status === 'completed') return fail('This challenge has finished.');

  const inserted = await db
    .insert(challengeEntries)
    .values({ id: `ce_${crypto.randomUUID()}`, challengeId, userId: user.id })
    .onConflictDoNothing()
    .returning({ id: challengeEntries.id });

  if (!inserted.length) return done('You’ve already joined.');

  await db
    .update(challenges)
    .set({ participants: sql`${challenges.participants} + 1` })
    .where(and(eq(challenges.id, challengeId)));

  revalidatePath('/challenges');
  revalidatePath('/dashboard');
  return done('Joined. Your progress will show on your dashboard.');
}
