import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { hasLogoAsset } from '@/lib/brand';
import { features } from '@/lib/env';
import { safeReturnTo } from '@/server/auth/oauth';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Login', robots: { index: false } };

const ERRORS: Record<string, string> = {
  discord_unconfigured: 'Discord login is not configured on this server yet.',
  discord_denied: 'Discord sign-in was cancelled.',
  invalid_state: 'That sign-in link expired. Please try again.',
  discord_failed: 'We couldn’t complete sign-in with Discord. Please try again.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const returnTo = safeReturnTo(typeof params.returnTo === 'string' ? params.returnTo : null);
  const error = typeof params.error === 'string' ? ERRORS[params.error] : null;

  if (await getCurrentUser()) redirect(returnTo);

  return (
    <section className="login">
      <div className="login__card panel panel--gold">
        <Logo hasLogoAsset={hasLogoAsset} size={96} sweep />
        <p className="eyebrow eyebrow--center">Members club</p>
        <h1 className="login__title">Welcome to FGDR</h1>
        <p className="muted">One login for raffles, challenges, milestones and your spot on the board.</p>

        {error ? (
          <p className="notice" role="alert">
            <Icon name="info" />
            {error}
          </p>
        ) : null}

        <a
          className="btn btn--discord btn--lg btn--block"
          href={`/api/auth/discord?returnTo=${encodeURIComponent(returnTo)}`}
          aria-disabled={!features.discordAuth}
        >
          <Icon name="discord" />
          Login with Discord
        </a>

        <ul className="login__list">
          <li>
            <Icon name="shield" />
            We only ask Discord for your username and avatar — never your email, servers or messages.
          </li>
          <li>
            <Icon name="lock" />
            No passwords. Your Discord tokens are never stored.
          </li>
          <li>
            <Icon name="kick" />
            Link your Kick account afterwards to enter raffles and track milestones.
          </li>
        </ul>

        {!features.discordAuth ? (
          <p className="notice notice--gold">
            <Icon name="info" />
            Discord credentials aren&apos;t set on this server. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to enable real
            sign-in.
          </p>
        ) : null}

        <p className="fineprint">18+ only. By signing in you agree to the FGDR terms of use and privacy policy.</p>
      </div>
    </section>
  );
}
