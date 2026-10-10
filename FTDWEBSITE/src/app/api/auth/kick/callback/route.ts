import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { siteUrl } from '@/lib/env';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { exchangeKickCode } from '@/server/auth/kick';
import { safeEqual, takeFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

/** Finish linking: the Kick identity comes from Kick itself, so it is verified. */
export async function GET(request: NextRequest) {
  const to = (status: string) => NextResponse.redirect(siteUrl(`/account?kick=${status}`));

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(siteUrl('/login?returnTo=/account'));

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return to('denied');

  const expected = await takeFlowCookie('fgdr_kick_state');
  const verifier = await takeFlowCookie('fgdr_kick_verifier');
  const code = params.get('code');
  if (!code || !verifier || !safeEqual(expected, params.get('state'))) return to('invalid_state');

  try {
    const kick = await exchangeKickCode(code, verifier);

    // One Kick account can belong to one FGDR member.
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.kickUserId, kick.userId), ne(users.id, user.id)))
      .limit(1);
    if (taken) return to('already_linked');

    await db
      .update(users)
      .set({
        kickUserId: kick.userId,
        kickUsername: kick.username,
        kickVerified: true,
        kickLinkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  } catch (error) {
    console.error('[auth] Kick link failed', error);
    return to('failed');
  }

  return to('linked');
}
