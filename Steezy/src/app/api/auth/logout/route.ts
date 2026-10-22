import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';
import { destroySession } from '@/server/auth/session';

/** POST-only so a stray link or image tag can't sign someone out. */
export async function POST() {
  await destroySession();
  return NextResponse.redirect(siteUrl('/'), { status: 303 });
}
