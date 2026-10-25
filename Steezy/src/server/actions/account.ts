'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { roobetLinks, users } from '@/server/db/schema';
import { requireUser } from '@/server/auth/session';
import { startVerification } from '@/server/kick/chat-verification';

/** Public-profile privacy. Unchecked boxes are absent from the form, so absence means off. */
export async function savePrivacy(formData: FormData): Promise<void> {
  const user = await requireUser();
  await db
    .update(users)
    .set({
      nameOnLeaderboards: formData.get('nameOnLeaderboards') === 'on',
      wagerPublic: formData.get('wagerPublic') === 'on',
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  redirect('/me?saved=privacy');
}

/** Issue a `!verify CODE` code for linking Kick through chat. */
export async function requestKickCode(): Promise<void> {
  const user = await requireUser();
  const result = await startVerification(user.id);
  if (!result.ok) redirect(`/me/link?error=${encodeURIComponent(result.message)}`);
  redirect('/me/link');
}

// Roobet usernames: letters, digits, underscore, dot, dash; 3–32 chars.
const roobetUsername = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.-]{3,32}$/, 'That doesn’t look like a Roobet username.');

/**
 * Submit (or resubmit after a rejection) a Roobet username for admin approval.
 * An approved username is locked: only an owner can unlock it from the admin panel.
 */
export async function submitRoobetUsername(formData: FormData): Promise<void> {
  const user = await requireUser();
  // Submitted from the profile page or the linking page; go back where it came from.
  const page = formData.get('from') === 'me' ? '/me' : '/me/link';
  const parsed = roobetUsername.safeParse(formData.get('username'));
  if (!parsed.success) redirect(`${page}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const [existing] = await db.select().from(roobetLinks).where(eq(roobetLinks.userId, user.id)).limit(1);
  if (existing?.status === 'approved') redirect(`${page}?error=Your%20Roobet%20username%20is%20already%20approved%20and%20locked.`);

  const now = new Date();
  await db
    .insert(roobetLinks)
    .values({ userId: user.id, requestedUsername: parsed.data, status: 'pending' })
    .onConflictDoUpdate({
      target: roobetLinks.userId,
      set: { requestedUsername: parsed.data, status: 'pending', rejectReason: null, reviewedBy: null, reviewedAt: null, updatedAt: now },
    });
  redirect(`${page}?roobet=submitted`);
}
