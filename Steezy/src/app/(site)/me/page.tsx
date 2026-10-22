import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { discordAvatarUrl } from '@/lib/discord';
import { getCurrentUser } from '@/server/auth/session';
import { savePrivacy } from '@/server/actions/account';
import { getMemberStats } from '@/server/services/member';
import { profilePath } from '@/server/services/profiles';
import { formatMinutes, formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'My profile' };

const ROOBET_STATUS = {
  pending: { label: 'Pending', cls: 'tag tag--warn' },
  approved: { label: 'Locked', cls: 'tag tag--warn' },
  rejected: { label: 'Rejected', cls: 'tag tag--danger' },
} as const;

export default async function MePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/me');

  const stats = await getMemberStats(user.id);
  const name = user.discordGlobalName || user.discordUsername;
  const roobet = stats.link ? ROOBET_STATUS[stats.link.status as keyof typeof ROOBET_STATUS] : null;

  return (
    <div className="container page">
      <section className="account-row" style={{ gap: 24 }}>
        <img className="avatar" src={discordAvatarUrl(user.discordId, user.discordAvatar, 256)} alt="" width={88} height={88} />
        <div className="account-row__body stack" style={{ gap: 8 }}>
          <span className="kicker">My profile</span>
          <h1 className="page__title">{name}</h1>
          <span className="meta">Member since {user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="row">
          {user.nameOnLeaderboards ? (
            <Link className="btn btn--secondary" href={profilePath(user)}>
              View public profile
            </Link>
          ) : null}
          <Link className="btn btn--primary" href="/me/link">
            Manage linked accounts
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn btn--secondary" type="submit">
              Log out
            </button>
          </form>
        </div>
      </section>

      <section className="stat-grid">
        <div className="card stack" style={{ gap: 6 }}>
          <span className="meta">Watch time</span>
          <span className="stat__value num">{formatMinutes(stats.watchMinutes)}</span>
          <span className="meta">From Kick chat activity while Steezy is live</span>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="meta">Streams attended</span>
          <span className="stat__value num">{stats.streams}</span>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="meta">Wagered this month</span>
          <span className="stat__value num">{stats.month === null ? '—' : formatUsd(stats.month)}</span>
          {stats.month === null ? <span className="meta">Needs an approved Roobet username</span> : null}
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <span className="meta">Lifetime wager</span>
          <span className="stat__value num">{stats.lifetime === null ? '—' : formatUsd(stats.lifetime)}</span>
          <span className="meta">Roobet · code STZY</span>
        </div>
      </section>

      <section className="card stack">
        <span className="kicker">Linked accounts</span>
        <div className="account-row">
          <span className="account-mark account-mark--discord">D</span>
          <div className="account-row__body">
            <div className="account-row__name">Discord</div>
            <div className="meta">{user.discordUsername} · login account</div>
          </div>
          <span className="tag tag--accent">Connected</span>
        </div>
        <div className="account-row">
          <span className="account-mark account-mark--kick">K</span>
          <div className="account-row__body">
            <div className="account-row__name">Kick</div>
            <div className="meta">{user.kickUsername ?? 'Not linked yet'}</div>
          </div>
          <span className={user.kickUserId ? 'tag tag--accent' : 'tag tag--neutral'}>{user.kickUserId ? 'Connected' : 'Not linked'}</span>
        </div>
        <div className="account-row">
          <span className="account-mark account-mark--roobet">R</span>
          <div className="account-row__body">
            <div className="account-row__name">Roobet</div>
            <div className="meta">{stats.link?.requestedUsername ?? 'Not linked yet'}</div>
          </div>
          <span className={roobet?.cls ?? 'tag tag--neutral'}>{roobet?.label ?? 'Not linked'}</span>
        </div>
      </section>

      <section className="card stack" id="privacy">
        <span className="kicker">Privacy</span>
        {saved === 'privacy' ? <p className="notice notice--ok">Privacy settings saved.</p> : null}
        <form action={savePrivacy} className="stack" style={{ gap: 14 }}>
          <label className="check">
            <input type="checkbox" name="nameOnLeaderboards" defaultChecked={user.nameOnLeaderboards} />
            Show my name in the Hall of Fame and draw results, and have a public profile (otherwise masked, e.g. Matt****). The
            wager leaderboard always masks names.
          </label>
          <label className="check">
            <input type="checkbox" name="wagerPublic" defaultChecked={user.wagerPublic} />
            Show my wager amounts and prize totals on my public profile
          </label>
          <div>
            <button className="btn btn--secondary" type="submit">
              Save privacy settings
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
