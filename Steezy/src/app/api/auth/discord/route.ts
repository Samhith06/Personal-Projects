import { NextResponse, type NextRequest } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { discordAuthorizeUrl } from '@/server/auth/discord';
import { randomToken, safeReturnTo, setFlowCookie } from '@/server/auth/oauth';

/** Step 1 of Discord login: issue state, remember where to return, redirect. */
export async function GET(request: NextRequest) {
  if (!features.discordAuth) return NextResponse.redirect(siteUrl('/login?error=discord_unconfigured'));

  const state = randomToken();
  await setFlowCookie('steezy_discord_state', state);
  await setFlowCookie('steezy_return_to', safeReturnTo(request.nextUrl.searchParams.get('returnTo')));
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
