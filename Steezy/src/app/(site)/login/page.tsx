import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { env, features, siteUrl } from '@/lib/env';
import { safeReturnTo } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';
import { TELEGRAM_CALLBACK_PATH } from '@/server/auth/telegram';
import { TelegramLogin } from '@/components/TelegramLogin';

export const metadata: Metadata = { title: 'Log in' };

const ERRORS: Record<string, string> = {
  discord_unconfigured: 'Discord login isn’t set up on this server yet.',
  discord_denied: 'Discord login was cancelled.',
  invalid_state: 'That login link expired. Please try again.',
  discord_failed: 'Discord didn’t let us in that time. Please try again.',
  telegram_unconfigured: 'Telegram login isn’t set up on this server yet.',
  telegram_invalid: 'That Telegram login expired or couldn’t be verified. Please try again.',
  telegram_failed: 'Telegram didn’t let us in that time. Please try again.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  if (await getCurrentUser()) redirect(safeReturnTo(returnTo));

  const back = returnTo ? `?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}` : '';
  const anyLogin = features.discordAuth || features.telegramAuth;
  return (
    <div className="container page page--narrow">
      <span className="kicker">Log in</span>
      <h1 className="page__title">Sign in to SteezySpins</h1>
      <p className="meta" style={{ fontSize: 15 }}>
        Use Discord or Telegram. We only read your name and avatar. Already have an account? Use the one you signed up with, then
        link the other from your profile.
      </p>
      {error ? <p className="notice notice--danger">{ERRORS[error] ?? 'Something went wrong. Please try again.'}</p> : null}
      <div className="stack" style={{ gap: 14, alignItems: 'flex-start' }}>
        {features.discordAuth ? (
          <a className="btn btn--primary" href={`/api/auth/discord${back}`}>
            Continue with Discord
          </a>
        ) : null}
        {features.telegramAuth ? <TelegramLogin bot={env.telegramBotUsername!} authUrl={siteUrl(`${TELEGRAM_CALLBACK_PATH}${back}`)} /> : null}
        {!anyLogin ? (
          <p className="notice notice--danger">
            Login is unavailable until DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET or TELEGRAM_BOT_TOKEN/TELEGRAM_BOT_USERNAME are set.
          </p>
        ) : null}
      </div>
    </div>
  );
}
