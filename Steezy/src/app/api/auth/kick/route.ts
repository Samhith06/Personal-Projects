import { NextResponse } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { kickAuthorizeUrl } from '@/server/auth/kick';
import { codeChallenge, randomToken, setFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

/** Step 1 of Kick linking. Only a signed-in member can link. */
export async function GET() {
  if (!features.kickAuth) return NextResponse.redirect(siteUrl('/me/link?error=kick_unconfigured'));
  if (!(await getCurrentUser())) return NextResponse.redirect(siteUrl('/login?returnTo=/me/link'));

  const state = randomToken();
  const verifier = randomToken(48);
  await setFlowCookie('steezy_kick_state', state);
  await setFlowCookie('steezy_kick_verifier', verifier);
  return NextResponse.redirect(kickAuthorizeUrl(state, codeChallenge(verifier)));
}
