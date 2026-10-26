import { NextResponse, type NextRequest } from 'next/server';
import { features, siteUrl } from '@/lib/env';
import { linkTelegram, upsertTelegramUser, verifyTelegramLogin } from '@/server/auth/telegram';
import { safeReturnTo } from '@/server/auth/oauth';
import { createSession, getCurrentUser, verifyLinkState } from '@/server/auth/session';
import { recordFingerprint } from '@/server/services/fingerprints';

/**
 * Where the Telegram widget lands. `link=1` (from /me) attaches Telegram to the
 * signed-in account — only with a `state` signed for that account; otherwise it
 * signs in with Telegram.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const linking = params.get('link') === '1';
  const fail = (code: string) =>
    NextResponse.redirect(siteUrl(linking ? `/me?error=${encodeURIComponent(LINK_ERRORS[code] ?? LINK_ERRORS.telegram_failed)}#accounts` : `/login?error=${code}`));
  if (!features.telegramAuth) return fail('telegram_unconfigured');

  const profile = verifyTelegramLogin(params);
  if (!profile) return fail('telegram_invalid');

  try {
    if (linking) {
      const user = await getCurrentUser();
      if (!user) return NextResponse.redirect(siteUrl('/login?returnTo=/me'));
      if (!(await verifyLinkState(params.get('state'), user.id))) return fail('telegram_invalid');
      if (!(await linkTelegram(user.id, profile))) return fail('telegram_taken');
      return NextResponse.redirect(siteUrl('/me?telegram=linked#accounts'));
    }
    const userId = await upsertTelegramUser(profile);
    await createSession(userId);
    await recordFingerprint(userId, request);
  } catch (error) {
    console.error('[auth] Telegram callback failed', error);
    return fail('telegram_failed');
  }

  return NextResponse.redirect(siteUrl(safeReturnTo(params.get('returnTo'))));
}

const LINK_ERRORS: Record<string, string> = {
  telegram_unconfigured: 'Telegram login isn’t set up on this server yet.',
  telegram_invalid: 'That Telegram login expired. Please try again.',
  telegram_taken: 'That Telegram account already has its own SteezySpins account.',
  telegram_failed: 'Couldn’t link Telegram. Please try again.',
};
