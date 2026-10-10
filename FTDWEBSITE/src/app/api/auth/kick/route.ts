import { NextResponse } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { kickAuthorizeUrl } from '@/server/auth/kick';
import { codeChallenge, randomToken, setFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

/** Start linking a Kick account (OAuth 2.1 + PKCE). Requires an FGDR session. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(siteUrl('/login?returnTo=/account'));
  if (!features.kickAuth) return NextResponse.redirect(siteUrl('/account?kick=unconfigured'));

  const state = randomToken();
  const verifier = randomToken(48);

  await setFlowCookie('fgdr_kick_state', state);
  await setFlowCookie('fgdr_kick_verifier', verifier);

  return NextResponse.redirect(kickAuthorizeUrl(state, codeChallenge(verifier)));
}
