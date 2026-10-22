import { NextResponse, type NextRequest } from 'next/server';
import { siteUrl } from '@/lib/env';
import { exchangeKickTokens, fetchKickMe } from '@/server/auth/kick';
import { safeEqual, takeFlowCookie } from '@/server/auth/oauth';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { saveBotAccount } from '@/server/kick/bot';
import { audit } from '@/server/services/audit';

const REDIRECT_PATH = '/api/auth/kick/bot/callback';

export async function GET(request: NextRequest) {
  const done = (q: string) => NextResponse.redirect(siteUrl(`/admin?${q}`));
  const user = await getCurrentUser();
  if (!user || !hasRole(user, 'owner')) return done('error=Only+an+owner+can+connect+the+bot.');

  const params = request.nextUrl.searchParams;
  const expected = await takeFlowCookie('steezy_kickbot_state');
  const verifier = await takeFlowCookie('steezy_kickbot_verifier');
  const code = params.get('code');
  if (params.get('error') || !code || !verifier || !safeEqual(expected, params.get('state'))) {
    return done('error=Kick+bot+connection+was+cancelled+or+expired.');
  }

  try {
    const tokens = await exchangeKickTokens(code, verifier, REDIRECT_PATH);
    const me = await fetchKickMe(tokens.accessToken);
    await saveBotAccount({ ...tokens, userId: me.userId, username: me.username, connectedAt: new Date().toISOString() });
    await audit(user.id, 'kick.bot_connected', 'kick_account', me.userId, null, { username: me.username });
    return done(`ok=${encodeURIComponent(`Chat bot connected as ${me.username}.`)}`);
  } catch (error) {
    console.error('[kick-bot] connect failed', error);
    return done('error=Kick+bot+connection+failed.');
  }
}
