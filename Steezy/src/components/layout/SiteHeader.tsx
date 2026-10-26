import Link from 'next/link';
import type { User } from '@/server/db/schema';
import { avatarUrl, displayName } from '@/lib/identity';
import { hasRole } from '@/server/auth/session';
import { env, loginHref, loginLabel } from '@/lib/env';

const NAV = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/giveaways', label: 'Giveaways' },
  { href: '/raffles', label: 'Raffles' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
];

/**
 * `huntOn`: a bonus hunt is running. `tournamentOn`: a tournament is taking
 * sign-ups or live. Each only appears in the nav while it's on.
 */
export function SiteHeader({
  user,
  live,
  huntOn,
  tournamentOn,
}: {
  user: User | null;
  live: boolean;
  huntOn: boolean;
  tournamentOn: 'signup' | 'live' | null;
}) {
  const name = user ? displayName(user) : null;
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__dot" aria-hidden="true" />
          SteezySpins
        </Link>
        <nav className="site-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          {huntOn ? (
            <Link href="/hunts" className="nav-live">
              <span className="dot dot--live" aria-hidden="true" />
              Hunt live
            </Link>
          ) : null}
          {tournamentOn ? (
            <Link href="/tournament" className="nav-live" title={tournamentOn === 'live' ? 'Tournament live' : 'Tournament sign-ups open'}>
              <span className={`dot ${tournamentOn === 'live' ? 'dot--live' : 'dot--warn'}`} aria-hidden="true" />
              Tournament
            </Link>
          ) : null}
        </nav>
        <div className="site-header__actions">
          {live ? (
            <a
              className="tag tag--accent"
              href={env.kickChannelSlug ? `https://kick.com/${env.kickChannelSlug}` : '#'}
              target="_blank"
              rel="noopener"
              style={{ textDecoration: 'none' }}
            >
              <span className="dot dot--live" aria-hidden="true" />
              Live
            </a>
          ) : null}
          <a className="btn btn--secondary roobet-chip" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
            <b>Roobet</b>
            <span className="meta">STZY</span>
          </a>
          {hasRole(user, 'mod') ? (
            <Link href="/admin" className="btn btn--secondary admin-chip" title="Staff area">
              <span aria-hidden="true">◆</span>
              <span className="admin-chip__label">Admin</span>
            </Link>
          ) : null}
          {user ? (
            <Link href="/me" className="me-chip" aria-label={`My profile (${name})`}>
              <img className="avatar" src={avatarUrl(user, 64)} alt="" width={32} height={32} />
              <span className="me-chip__name">{name}</span>
            </Link>
          ) : (
            <a className="btn btn--primary" href={loginHref()}>
              {loginLabel()}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
