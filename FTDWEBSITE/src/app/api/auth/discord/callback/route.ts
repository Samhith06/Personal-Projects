import { NextResponse, type NextRequest } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { exchangeDiscordCode, upsertDiscordUser } from '@/server/auth/discord';
import { safeEqual, safeReturnTo, takeFlowCookie } from '@/server/auth/oauth';
import { createSession } from '@/server/auth/session';

/** Step 2 of Discord login: verify state, exchange code server-side, sign in. */
export async function GET(request: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(siteUrl(`/login?error=${code}`));

  if (!features.discordAuth) return fail('discord_unconfigured');

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return fail('discord_denied');

  const expected = await takeFlowCookie('fgdr_discord_state');
  const returnTo = safeReturnTo(await takeFlowCookie('fgdr_return_to'));
  const code = params.get('code');

  if (!code || !safeEqual(expected, params.get('state'))) return fail('invalid_state');

  try {
    const profile = await exchangeDiscordCode(code);
    const userId = await upsertDiscordUser(profile);
    await createSession(userId);
  } catch (error) {
    console.error('[auth] Discord callback failed', error);
    return fail('discord_failed');
  }

  return NextResponse.redirect(siteUrl(returnTo));
}
