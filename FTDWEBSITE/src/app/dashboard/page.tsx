import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { MemberShell } from '@/components/member/MemberShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Countdown } from '@/components/ui/client';
import { Movement, ProgressBar } from '@/components/ui/primitives';
import { dateLabel, num, usd } from '@/lib/format';
import { db } from '@/server/db';
import { challengeEntries, challenges, raffleEntries, raffles } from '@/server/db/schema';
import { getCurrentUser, getMemberProgress } from '@/server/auth/session';
import { LEADERBOARD_SITE_LABEL, getMemberLeaderboardPositions, getMilestones } from '@/server/services/content';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

const maskStake = (v: string) => (v.length <= 3 ? '•••' : `${v.slice(0, 2)}${'•'.repeat(Math.max(3, v.length - 3))}${v.slice(-1)}`);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/dashboard');

  const [progress, tiers, positions, myRaffles, myChallenges] = await Promise.all([
    getMemberProgress(user.id),
    getMilestones(),
    getMemberLeaderboardPositions(user.id),
    db
      .select({ entry: raffleEntries, raffle: raffles })
      .from(raffleEntries)
      .innerJoin(raffles, eq(raffles.id, raffleEntries.raffleId))
      .where(eq(raffleEntries.userId, user.id))
      .orderBy(desc(raffleEntries.createdAt)),
    db
      .select({ entry: challengeEntries, challenge: challenges })
      .from(challengeEntries)
      .innerJoin(challenges, eq(challenges.id, challengeEntries.challengeId))
      .where(eq(challengeEntries.userId, user.id))
      .orderBy(desc(challengeEntries.joinedAt)),
  ]);

  const wagered = progress.totalWagered;
  const unlocked = tiers.filter((t) => t.threshold <= wagered);
  const next = tiers.find((t) => t.threshold > wagered);
  const prevThreshold = unlocked.at(-1)?.threshold ?? 0;

  type ActivityRow = { icon: IconName; text: string; at: Date };
  const activity: ActivityRow[] = [
    { icon: 'discord' as IconName, text: 'Joined FGDR with Discord', at: user.createdAt },
    ...(user.kickLinkedAt ? [{ icon: 'kick' as IconName, text: `Linked Kick account @${user.kickUsername}`, at: user.kickLinkedAt }] : []),
    ...myRaffles.map((r) => ({ icon: 'ticket' as IconName, text: `Entered ${r.raffle.name}`, at: r.entry.createdAt })),
    ...myChallenges.map((c) => ({ icon: 'flag' as IconName, text: `Joined ${c.challenge.name}`, at: c.entry.joinedAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return (
    <MemberShell user={user} active="/dashboard">
      <section className="section section--sm" style={{ paddingTop: 'clamp(2rem, 1.5rem + 2vw, 3.5rem)' }}>
        <div className="container dash-grid">
          {/* ------------------------------------------------------ Profile */}
          <article className="panel dash-card">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="user" />
                My profile
              </h2>
            </div>
            <dl className="kv">
              <dt>Discord</dt>
              <dd>@{user.discordUsername}</dd>
            </dl>
            <dl className="kv">
              <dt>Role</dt>
              <dd style={{ textTransform: 'capitalize' }}>{user.role}</dd>
            </dl>
            <Link className="link-arrow" href="/account">
              Manage account
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* --------------------------------------------------------- Kick */}
          <article className="panel dash-card">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="kick" />
                My Kick
              </h2>
              {user.kickUsername ? (
                <span className={`tag ${user.kickVerified ? 'tag--success' : ''}`}>
                  {user.kickVerified ? <Icon name="verified" /> : null}
                  {user.kickVerified ? 'Verified' : 'Unverified'}
                </span>
              ) : null}
            </div>
            {user.kickUsername ? (
              <>
                <p className="dash-big" style={{ fontSize: '1.6rem' }}>
                  @{user.kickUsername}
                </p>
                <a className="link-arrow" href={`https://kick.com/${encodeURIComponent(user.kickUsername)}`} target="_blank" rel="noopener noreferrer">
                  View on Kick
                  <Icon name="external" />
                </a>
              </>
            ) : (
              <>
                <p className="dash-sub">Link Kick to enter raffles and have your wagers counted toward milestones.</p>
                <Link className="btn btn--gold btn--sm" href="/account#kick">
                  <Icon name="link" />
                  Link Kick account
                </Link>
              </>
            )}
          </article>

          {/* -------------------------------------------------------- Stake */}
          <article className="panel dash-card">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="spade" />
                My Stake accounts
              </h2>
              <span className="tag">
                <Icon name="lock" />
                Private
              </span>
            </div>
            {user.stakeUsername || user.stakeEuUsername ? (
              [
                { site: 'Stake.com', name: user.stakeUsername },
                { site: 'Stake.eu', name: user.stakeEuUsername },
              ].map((a) => (
                <p key={a.site} className="dash-sub">
                  {a.site} ·{' '}
                  {a.name ? (
                    <span className="tabular" aria-label={`${a.site} username saved (hidden)`}>
                      {maskStake(a.name)}
                    </span>
                  ) : (
                    'not set'
                  )}
                </p>
              ))
            ) : (
              <p className="dash-sub">Not set yet. Only you and the FGDR team can see them.</p>
            )}
            <Link className="link-arrow" href="/account#stake">
              {user.stakeUsername || user.stakeEuUsername ? 'Edit' : 'Add Stake usernames'}
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* -------------------------------------------------- Leaderboard */}
          <article className="panel dash-card">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="chart" />
                My leaderboard position
              </h2>
            </div>
            {positions.length ? (
              positions.map(({ site, entry }) => (
                <div key={site}>
                  <p className="dash-big gold-text tabular">#{entry.rank}</p>
                  <p className="dash-sub">
                    {LEADERBOARD_SITE_LABEL[site]} · {usd(entry.wagered)} wagered <Movement value={entry.movement} />
                  </p>
                  {entry.prize ? <p className="tag tag--gold">{usd(entry.prize)} prize position</p> : null}
                </div>
              ))
            ) : (
              <p className="dash-sub">You&apos;re not ranked on the Stake.com or Stake.eu board yet.</p>
            )}
            <Link className="link-arrow" href="/leaderboard">
              Full leaderboard
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* --------------------------------------------------- Milestones */}
          <article className="panel dash-card dash-card--wide">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="trophy" />
                My milestones
              </h2>
              <span className="tag tag--gold">
                {unlocked.length}/{tiers.length} unlocked
              </span>
            </div>
            <p className="dash-big tabular">{usd(wagered)}</p>
            <p className="dash-sub">Verified lifetime wager</p>
            {next ? (
              <>
                <p style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.88rem' }}>
                  <span>
                    Next: <strong>{next.name}</strong> · {next.reward}
                  </span>
                  <span className="muted tabular">{usd(next.threshold - wagered)} to go</span>
                </p>
                <ProgressBar value={wagered - prevThreshold} max={next.threshold - prevThreshold} label={`Progress to ${next.name}`} tone="cyan" size="lg" />
              </>
            ) : (
              <p className="tag tag--gold">Every tier unlocked</p>
            )}
            <Link className="link-arrow" href="/milestones">
              All milestones
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* ------------------------------------------------------ Raffles */}
          <article className="panel dash-card dash-card--half">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="ticket" />
                My raffle entries
              </h2>
              <span className="tag">{myRaffles.length}</span>
            </div>
            {myRaffles.length ? (
              <ul className="dash-list">
                {myRaffles.map(({ raffle, entry }) => (
                  <li key={entry.id}>
                    <span>
                      <strong>{raffle.name}</strong>
                      <br />
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        Entered {dateLabel(entry.createdAt, 'UTC')}
                      </span>
                    </span>
                    {raffle.status === 'active' ? (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        Draw in <Countdown compact target={raffle.endsAt.toISOString()} label={`${raffle.name} draw`} />
                      </span>
                    ) : (
                      <span className="tag">{raffle.winnerHandle ? `Won by ${raffle.winnerHandle}` : raffle.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-sub">No entries yet.</p>
            )}
            <Link className="link-arrow" href="/raffles">
              Browse raffles
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* --------------------------------------------------- Challenges */}
          <article className="panel dash-card dash-card--half">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="flag" />
                My challenges
              </h2>
              <span className="tag">{myChallenges.length}</span>
            </div>
            {myChallenges.length ? (
              <ul className="dash-list">
                {myChallenges.map(({ challenge, entry }) => (
                  <li key={entry.id} style={{ display: 'grid', gap: '0.5rem', justifyContent: 'stretch' }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <strong>{challenge.name}</strong>
                      <span className="muted tabular">
                        {challenge.goalType === 'currency' ? usd(challenge.goalCurrent) : num(challenge.goalCurrent)} /{' '}
                        {challenge.goalType === 'currency' ? usd(challenge.goalTarget) : num(challenge.goalTarget)}
                      </span>
                    </span>
                    <ProgressBar value={challenge.goalCurrent} max={challenge.goalTarget} label={`${challenge.name} progress`} size="thin" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-sub">You haven&apos;t joined a challenge yet.</p>
            )}
            <Link className="link-arrow" href="/challenges">
              Browse challenges
              <Icon name="arrow-right" />
            </Link>
          </article>

          {/* ----------------------------------------------------- Activity */}
          <article className="panel dash-card dash-card--full">
            <div className="dash-card__head">
              <h2 className="dash-card__title">
                <Icon name="signal" />
                My activity
              </h2>
            </div>
            <ul className="dash-list">
              {activity.map((a, i) => (
                <li key={i}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon name={a.icon} style={{ width: 16, height: 16, color: 'var(--gold-2)' }} />
                    {a.text}
                  </span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {dateLabel(a.at, 'UTC')}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </MemberShell>
  );
}
