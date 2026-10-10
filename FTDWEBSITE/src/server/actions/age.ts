'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { destroySession, getCurrentUser } from '@/server/auth/session';

/** Member confirmed they are 18+ (or the legal gambling age where they live). */
export async function confirmAge(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(users).set({ ageConfirmedAt: new Date() }).where(eq(users.id, user.id));
}

/** Member said they are under age: sign them out straight away. */
export async function declineAge(): Promise<void> {
  await destroySession();
  redirect('/legal/responsible-gambling?underage=1');
}
