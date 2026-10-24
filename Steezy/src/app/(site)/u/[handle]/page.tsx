import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { findByHandle, profileView, type Trophy } from '@/server/services/profiles';
import { discordAvatarUrl } from '@/lib/discord';
import { formatMinutes, formatUsd, ordinal } from '@/lib/format';
import { publicName } from '@/server/services/people';

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const user = await findByHandle(decodeURIComponent(handle));
  return { title: user ? publicName(user) : 'Profile not found' };
}

const MEDAL = ['var(--medal-gold)', 'var(--medal-silver)', 'var(--medal-bronze)'];
const KIND: Record<Trophy['kind'], string> = { leaderboard: 'Leaderboard', raffle: 'Raffle', giveaway: 'Giveaway', milestone: 'Milestone' };
const TONE = { warn: 'tag tag--warn', accent: 'tag tag--accent', neutral: 'tag tag--neutral' } as const;

export default async function PublicProfile({ params }: Params) {
  const { handle } = await params;
  const user = await findByHandle(decodeURIComponent(handle));
  if (!user) notFound();
  const [view, viewer] = await Promise.all([profileView(user), getCurrentUser()]);
  const name = publicName(user);
  const isMe = viewer?.id === user.id;
  const showAmounts = user.wagerPublic;
  /** The member and staff always see wager totals; everyone else only when the member made them public. */
  const showWager = showAmounts || isMe || hasRole(viewer, 'mod');
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });

  return (
    <>
      <section className="profile-hero">
        <div className="container profile-hero__inner">
          <img className="avatar profile-hero__avatar" src={discordAvatarUrl(user.discordId, user.discordAvatar, 256)} alt="" width={120} height={120} />
          <div className="stack" style={{ gap: 10, flex: '1 1 260px' }}>
            <span className="profile-hero__url">steezespins/u/{handle}</span>
            <h1 className="profile-hero__name">{name}</h1>
            <div className="row">
              {view.badges.map((b) => (
                <span key={b.key} className={TONE[b.tone]}>
                  {b.name}
                </span>
              ))}
              <span style={{ fontSize: 13, color: 'var(--color-accent-300)' }}>
                Member since {user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="row">
            {user.kickUsername ? (
              <a className="btn btn--secondary" href={`https://kick.com/${user.kickUsername}`} target="_blank" rel="noopener">
                kick.com/{user.kickUsername}
              </a>
            ) : null}
            {isMe ? (
              <Link className="btn btn--secondary" href="/me">
                Edit privacy
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container page">
        <section className="stat-grid stat-grid--profile">
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Total wagered</span>
            <span className="stat__value num" style={{ color: view.wager && showWager ? 'var(--color-roobet)' : undefined }}>
              {!view.wager ? '—' : showWager ? formatUsd(view.wager.total) : 'Hidden'}
            </span>
            <span className="meta">{!view.wager ? 'Roobet not linked' : showWager ? 'All time on Roobet · code STZY' : `Hidden by ${name}`}</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Wagered this month</span>
            <span className="stat__value num" style={{ color: view.wager && showWager ? 'var(--color-roobet)' : undefined }}>
              {!view.wager ? '—' : showWager ? formatUsd(view.wager.month) : 'Hidden'}
            </span>
            <span className="meta">{!view.wager ? 'Roobet not linked' : showWager ? `${monthName} so far` : `Hidden by ${name}`}</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Watch time</span>
            <span className="stat__value num">{formatMinutes(view.watch.minutes)}</span>
            <span className="meta">
              {view.watch.streams} stream{view.watch.streams === 1 ? '' : 's'} attended
            </span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Best finish</span>
            <span className="stat__value num" style={{ color: view.bestFinish ? MEDAL[view.bestFinish - 1] : undefined }}>
              {view.bestFinish ? ordinal(view.bestFinish) : '—'}
            </span>
            <span className="meta">{view.titles ? `${view.titles}× monthly champion` : 'Monthly leaderboard'}</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Prizes won</span>
            <span className="stat__value num" style={{ color: 'var(--color-accent)' }}>
              {showAmounts ? formatUsd(view.prizeTotal) : view.trophies.length}
            </span>
            <span className="meta">{showAmounts ? 'leaderboards, raffles, milestones' : 'trophies'}</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="meta">Biggest hit</span>
            <span className="stat__value num" style={{ color: 'var(--color-accent)' }}>
              {view.bestHit ? `${view.bestHit.multiplier.toLocaleString('en-US', { maximumFractionDigits: 1 })}×` : '—'}
            </span>
            <span className="meta">{view.bestHit ? view.bestHit.gameTitle : view.linkedRoobet ? 'No hits recorded yet' : 'Roobet not linked'}</span>
          </div>
        </section>

        <section className="profile-split">
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="row" style={{ justifyContent: 'space-between', padding: '8px 0 12px' }}>
              <div>
                <div className="kicker" style={{ marginBottom: 6 }}>
                  Leaderboard history
                </div>
                <h2 style={{ fontSize: 20 }}>Monthly finishes</h2>
              </div>
              {!showAmounts ? <span className="tag tag--neutral">Wager amounts hidden by {name}</span> : null}
            </div>
            {view.finishes.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Place</th>
                      <th style={{ textAlign: 'right' }}>Wagered</th>
                      <th style={{ textAlign: 'right' }}>Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.finishes.map((f) => (
                      <tr key={f.board + f.rank}>
                        <td>{f.board}</td>
                        <td className="num" style={{ color: MEDAL[f.rank - 1] ?? 'var(--color-text)', fontWeight: 600 }}>
                          {ordinal(f.rank)}
                        </td>
                        <td className="num" style={{ textAlign: 'right', color: showAmounts ? undefined : 'var(--color-muted)' }}>
                          {showAmounts ? formatUsd(f.wagered) : 'Hidden'}
                        </td>
                        <td className="num" style={{ textAlign: 'right', color: 'var(--color-accent)' }}>
                          {f.prize ? formatUsd(f.prize) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="meta">No finished leaderboards yet.</p>
            )}
          </div>

          <aside className="stack" style={{ gap: 24 }}>
            {view.bestHit ? (
              <div className="card stack" style={{ gap: 10 }}>
                <span className="kicker">Biggest hit</span>
                <span className="num" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>
                  {view.bestHit.multiplier.toLocaleString('en-US', { maximumFractionDigits: 1 })}×
                </span>
                <strong>{view.bestHit.gameTitle}</strong>
                <span className="meta">
                  {showAmounts ? `${formatUsd(view.bestHit.wagered)} bet · ${formatUsd(view.bestHit.payout)} paid · ` : ''}
                  Roobet, {new Date(`${view.bestHit.day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}
                </span>
              </div>
            ) : null}
            <div className="card">
              <span className="kicker">Trophy case</span>
              {view.trophies.length ? (
                view.trophies.slice(0, 8).map((t, i) => (
                  <div key={i} className="admin-row">
                    <div className="admin-row__body">
                      <div style={{ fontWeight: 500 }}>{t.title}</div>
                      <div className="meta">
                        {KIND[t.kind]} · {t.when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    {t.prize !== null && showAmounts ? <span className="tag tag--warn">{formatUsd(t.prize)}</span> : null}
                  </div>
                ))
              ) : (
                <p className="meta" style={{ marginTop: 10 }}>
                  No trophies yet.
                </p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}
