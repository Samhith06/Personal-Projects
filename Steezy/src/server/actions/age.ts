'use server';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { destroySession, getCurrentUser } from '@/server/auth/session';
import { AGE_COOKIE } from '@/lib/age';
import { env } from '@/lib/env';

const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function rememberAge() {
  const jar = await cookies();
  jar.set(AGE_COOKIE, '1', { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/', maxAge: AGE_COOKIE_MAX_AGE });
}

/** Member confirmed they are 18+ (or the legal gambling age where they live). */
export async function confirmAge(): Promise<void> {
  await rememberAge();
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(users).set({ ageConfirmedAt: new Date() }).where(eq(users.id, user.id));
}

/** Member said they are under age: sign them out straight away. */
export async function declineAge(): Promise<void> {
  const user = await getCurrentUser();
  // A visitor who isn't signed in is sent off-site; the gate would cover our own pages.
  if (!user) redirect('https://www.begambleaware.org');
  await destroySession();
  redirect('/terms?underage=1#responsible-gambling');
}
