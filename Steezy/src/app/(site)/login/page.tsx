import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { features } from '@/lib/env';
import { safeReturnTo } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Log in' };

const ERRORS: Record<string, string> = {
  discord_unconfigured: 'Discord login isn’t set up on this server yet.',
  discord_denied: 'Discord login was cancelled.',
  invalid_state: 'That login link expired. Please try again.',
  discord_failed: 'Discord didn’t let us in that time. Please try again.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  if (await getCurrentUser()) redirect(safeReturnTo(returnTo));

  const href = `/api/auth/discord${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
  return (
    <div className="container page page--narrow">
      <span className="kicker">Log in</span>
      <h1 className="page__title">Sign in with Discord</h1>
      <p className="meta" style={{ fontSize: 15 }}>
        Your Discord account is your SteezeSpins account. We only read your Discord name and avatar.
      </p>
      {error ? <p className="notice notice--danger">{ERRORS[error] ?? 'Something went wrong. Please try again.'}</p> : null}
      <div>
        {features.discordAuth ? (
          <a className="btn btn--primary" href={href}>
            Continue with Discord
          </a>
        ) : (
          <p className="notice notice--danger">Discord login is unavailable until DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are set.</p>
        )}
      </div>
    </div>
  );
}
