import { NextResponse } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { kickAuthorizeUrl } from '@/server/auth/kick';
import { codeChallenge, randomToken, setFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser, hasRole } from '@/server/auth/session';

const KICK_BOT_REDIRECT_PATH = '/api/auth/kick/bot/callback';

/** Owner only: connect the Kick account the chat bot replies as. */
export async function GET() {
  if (!features.kickAuth) return NextResponse.redirect(siteUrl('/admin?error=Kick+credentials+are+not+configured.'));
  const user = await getCurrentUser();
  if (!hasRole(user, 'owner')) return NextResponse.redirect(siteUrl('/admin?error=Only+an+owner+can+connect+the+bot.'));

  const state = randomToken();
  const verifier = randomToken(48);
  await setFlowCookie('steezy_kickbot_state', state);
  await setFlowCookie('steezy_kickbot_verifier', verifier);
  return NextResponse.redirect(kickAuthorizeUrl(state, codeChallenge(verifier), 'user:read chat:write', KICK_BOT_REDIRECT_PATH));
}
