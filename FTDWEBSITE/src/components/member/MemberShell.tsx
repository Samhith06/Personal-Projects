import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { dateLabel } from '@/lib/format';
import { discordAvatarUrl } from '@/server/auth/discord';
import type { User } from '@/server/db/schema';

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/account', label: 'Account & linked accounts' },
];

export function MemberShell({ user, active, children }: { user: User; active: string; children: ReactNode }) {
  const name = user.discordGlobalName || user.discordUsername;
  return (
    <>
      <section className="member-hero">
        <div className="container">
          <div className="member-hero__inner">
            <span className="member-hero__avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={discordAvatarUrl(user.discordId, user.discordAvatar, 192)} alt="" width={96} height={96} />
            </span>
            <div className="member-hero__body">
              <p className="eyebrow">FGDR member</p>
              <h1 className="member-hero__name">{name}</h1>
              <p className="member-hero__meta">
                <span>
                  <Icon name="discord" style={{ width: 15, height: 15, display: 'inline', verticalAlign: '-3px' }} /> @{user.discordUsername}
                </span>
                <span>Member since {dateLabel(user.createdAt, 'UTC')}</span>
                {user.role !== 'member' ? <span className="tag tag--gold">{user.role}</span> : null}
              </p>
            </div>
            {user.role === 'admin' ? (
              <Link className="btn btn--ghost btn--sm" href="/admin">
                <Icon name="shield" />
                Admin
              </Link>
            ) : null}
          </div>
          <nav className="member-tabs" aria-label="Member area">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} aria-current={active === t.href ? 'page' : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      {children}
    </>
  );
}
