import Link from 'next/link';
import type { User } from '@/server/db/schema';
import { discordAvatarUrl } from '@/lib/discord';
import { hasRole } from '@/server/auth/session';
import { env } from '@/lib/env';

const NAV = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/giveaways', label: 'Giveaways' },
  { href: '/raffles', label: 'Raffles' },
  { href: '/hunts', label: 'Hunts' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
];

export function SiteHeader({ user, live }: { user: User | null; live: boolean }) {
  const name = user ? user.discordGlobalName || user.discordUsername : null;
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__dot" aria-hidden="true" />
          SteezeSpins
        </Link>
        <nav className="site-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          {hasRole(user, 'mod') ? <Link href="/admin">Admin</Link> : null}
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
          {user ? (
            <Link href="/me" className="me-chip">
              <img className="avatar" src={discordAvatarUrl(user.discordId, user.discordAvatar, 64)} alt="" width={32} height={32} />
              {name}
            </Link>
          ) : (
            <a className="btn btn--primary" href="/api/auth/discord">
              Log in with Discord
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
