import { NextResponse, type NextRequest } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { exchangeKickCode, linkKickAccount } from '@/server/auth/kick';
import { safeEqual, takeFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

/** Step 2 of Kick linking: verify state + PKCE, then attach the Kick identity to the signed-in member. */
export async function GET(request: NextRequest) {
  const done = (q: string) => NextResponse.redirect(siteUrl(`/me/link?${q}`));
  if (!features.kickAuth) return done('error=kick_unconfigured');

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(siteUrl('/login?returnTo=/me/link'));

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return done('error=kick_denied');

  const expected = await takeFlowCookie('steezy_kick_state');
  const verifier = await takeFlowCookie('steezy_kick_verifier');
  const code = params.get('code');
  if (!code || !verifier || !safeEqual(expected, params.get('state'))) return done('error=invalid_state');

  try {
    const kick = await exchangeKickCode(code, verifier);
    const result = await linkKickAccount(user.id, kick, 'oauth');
    return done(result === 'linked' ? 'kick=linked' : 'error=kick_taken');
  } catch (error) {
    console.error('[auth] Kick callback failed', error);
    return done('error=kick_failed');
  }
}
