import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChallengeCard } from '@/components/competition';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { ClipCard, FameCard } from '@/components/media/cards';
import { MediaGroup } from '@/components/media/MediaPlayer';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, ExternalLink, Medallion, ProgressBar, SocialLinks } from '@/components/ui/primitives';
import { compact, dateLabel, duration, num, usd } from '@/lib/format';
import {
  clipToMedia,
  getChallenges,
  getClips,
  getGiveaways,
  getPastStreams,
  getStreamer,
  getWins,
  winToMedia,
} from '@/server/services/content';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/streamers/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStreamer(slug);
  if (!s) return { title: 'Streamer not found' };
  return { title: s.displayName, description: s.tagline || s.bio.slice(0, 160) };
}

/** Next round-number goal above a value, for channel milestone bars. */
function nextGoal(value: number) {
  const steps = [1_000, 2_500, 5_000, 10_000, 15_000, 20_000, 25_000, 50_000, 75_000, 100_000, 250_000, 500_000, 750_000, 1_000_000, 2_500_000, 5_000_000];
  return steps.find((s) => s > value) ?? value * 2;
}

export default async function StreamerPage({ params }: PageProps<'/streamers/[slug]'>) {
  const { slug } = await params;
  const streamer = await getStreamer(slug);
  if (!streamer || !streamer.isActive) notFound();

  const [clips, wins, streams, allChallenges, allGiveaways] = await Promise.all([
    getClips({ streamerId: streamer.id, limit: 6 }),
    getWins({ streamerId: streamer.id, sort: 'payout', limit: 3 }),
    getPastStreams(streamer.id, 5),
    getChallenges(),
    getGiveaways(200),
  ]);

  // What this channel has handed back, for the sidebar.
  const channelGiveaways = allGiveaways.filter((g) => g.streamerId === streamer.id);
  const givenAway = channelGiveaways.reduce((sum, g) => sum + g.amount, 0);

  const clipMedia = clips.map((c) => clipToMedia(c, streamer));
  const winMedia = wins.map((w) => winToMedia(w, streamer));
  const hosted = allChallenges.filter((c) => c.hostId === streamer.id).slice(0, 2);

  const goals = [
    { label: 'Kick followers', value: streamer.followers, format: 'number' as const },
    { label: 'Community wager', value: streamer.allTimeWager, format: 'currency' as const },
  ].filter((g) => g.value > 0);

  /** Only the figures somebody has actually supplied. */
  const stats = [
    { label: 'Followers', value: compact(streamer.followers), show: streamer.followers > 0 },
    { label: 'Avg viewers', value: compact(streamer.avgViewers), show: streamer.avgViewers > 0 },
    { label: 'Peak viewers', value: compact(streamer.peakViewers), show: streamer.peakViewers > 0 },
    { label: 'Streams this month', value: String(streamer.streamsThisMonth), show: streamer.streamsThisMonth > 0 },
    { label: 'Biggest win', value: usd(streamer.biggestWin), show: streamer.biggestWin > 0, gold: true },
  ].filter((s) => s.show);

  return (
    <>
      <section className={`profile-hero accent-${streamer.accent}`}>
        <div className="profile-hero__banner" aria-hidden="true">
          {streamer.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={streamer.bannerUrl} alt="" />
          ) : null}
        </div>
        <div className="container profile-hero__inner">
          <Medallion monogram={streamer.monogram} imageUrl={streamer.avatarUrl} accent={streamer.accent} size="xxl" />
          <div className="profile-hero__body">
            <p className="eyebrow">{streamer.role}</p>
            <h1 className="display profile-hero__name">{streamer.displayName}</h1>
            <div className="profile-hero__status">
              <LiveStatusBadge streamerId={streamer.id} showViewers />
              <span>
                <Icon name="kick" style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px', color: '#53fc18' }} />{' '}
                kick.com/{streamer.kickUsername}
              </span>
            </div>
            <p className="lede">{streamer.bio}</p>
          </div>
          <div className="profile-hero__actions">
            <a className="btn btn--gold btn--lg" href={streamer.kickUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="kick" />
              Watch on Kick
            </a>
            <SocialLinks streamer={streamer} includeKick={false} />
          </div>
        </div>
      </section>

      <section className="section section--sm" style={{ paddingTop: 'clamp(2rem, 1.5rem + 2vw, 3.5rem)' }}>
        <div className="container">
          {/* A stat nobody has filled in yet is left out rather than shown as a zero. */}
          {stats.length ? (
            <dl className="stat-row reveal" style={{ marginBottom: 'clamp(3.5rem, 3rem + 3vw, 6rem)' }}>
              {stats.map((stat) => (
                <div className="stat" key={stat.label}>
                  <dt className="stat__label">{stat.label}</dt>
                  <dd className={`stat__value ${stat.gold ? 'gold-text' : ''}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="profile-layout">
            <div className="profile-main">
              {/* ---------------------------------------------------- Clips */}
              <div>
                <div className="block-title">
                  <h2>Featured clips</h2>
                  <Link className="link-arrow" href={`/clips?creator=${streamer.id}`}>
                    All clips
                    <Icon name="arrow-right" />
                  </Link>
                </div>
                {clipMedia.length ? (
                  <MediaGroup items={clipMedia} className="grid-2">
                    {clipMedia.slice(0, 4).map((m, i) => (
                      <ClipCard key={m.id} media={m} index={i} category={clips[i].category} monogram={streamer.monogram} />
                    ))}
                  </MediaGroup>
                ) : (
                  <EmptyState title="No clips yet" body="Clips from this channel will appear here." icon="film" />
                )}
              </div>

              {/* ------------------------------------------------ Moments */}
              {winMedia.length ? (
                <div>
                  <div className="block-title">
                    <h2>Featured moments</h2>
                    <Link className="link-arrow" href={`/wall-of-fame?creator=${streamer.id}`}>
                      Wall of Fame
                      <Icon name="arrow-right" />
                    </Link>
                  </div>
                  <MediaGroup items={winMedia} className="grid-2">
                    {winMedia.slice(0, 2).map((m, i) => (
                      <FameCard key={m.id} media={m} index={i} kind={wins[i].kind} monogram={streamer.monogram} size="row" />
                    ))}
                  </MediaGroup>
                </div>
              ) : null}

              {/* ------------------------------------------------ Streams */}
              <div>
                <div className="block-title">
                  <h2>Recent streams</h2>
                </div>
                {streams.length ? (
                  <ul className="streams-list panel" style={{ padding: '0.5rem 1.5rem' }}>
                    {streams.map((st) => (
                      <li key={st.id}>
                        <span className="streams-list__title">{st.title}</span>
                        <span className="streams-list__meta">
                          <span>{dateLabel(st.airedAt, 'UTC')}</span>
                          <span>{duration(st.durationMin)}</span>
                          <span>{st.category}</span>
                        </span>
                        <span className="streams-list__peak">
                          <b className="tabular">{num(st.peakViewers)}</b>
                          peak
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No recent streams" body="Past broadcasts will show here." />
                )}
              </div>

              {/* --------------------------------------------- Challenges */}
              {hosted.length ? (
                <div>
                  <div className="block-title">
                    <h2>Challenges</h2>
                    <Link className="link-arrow" href="/challenges">
                      All challenges
                      <Icon name="arrow-right" />
                    </Link>
                  </div>
                  <div className="grid-2">
                    {hosted.map((c) => (
                      <ChallengeCard key={c.id} challenge={c} host={streamer} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="profile-aside">
              {channelGiveaways.length ? (
                <div className="panel side-card">
                  <h3>Given away</h3>
                  <p className="dash-big gold-text tabular">{usd(givenAway)}</p>
                  <p className="dash-sub">
                    across {num(channelGiveaways.length)} {channelGiveaways.length === 1 ? 'payout' : 'payouts'}
                  </p>
                  <ul className="side-list">
                    {channelGiveaways.slice(0, 4).map((g) => (
                      <li key={g.id}>
                        <span>{g.winnerHandle}</span>
                        <b className="tabular">{usd(g.amount)}</b>
                      </li>
                    ))}
                  </ul>
                  <Link className="link-arrow" href="/giveaways">
                    The whole board <Icon name="arrow-right" />
                  </Link>
                </div>
              ) : null}

              <div className="panel side-card">
                <h3>Channel milestones</h3>
                <ul className="goal-list">
                  {goals.map((g) => {
                    const target = nextGoal(g.value);
                    const fmtV = (n: number) => (g.format === 'currency' ? usd(n) : num(n));
                    return (
                      <li key={g.label}>
                        <div className="goal-list__row">
                          <span className="muted">{g.label}</span>
                          <span>
                            <b className="tabular">{fmtV(g.value)}</b> <span className="muted">/ {fmtV(target)}</span>
                          </span>
                        </div>
                        <ProgressBar value={g.value} max={target} label={`${g.label} milestone`} tone="gold" size="thin" />
                      </li>
                    );
                  })}
                  {streamer.rafflesHosted > 0 ? (
                    <li>
                      <div className="goal-list__row">
                        <span className="muted">Raffles hosted</span>
                        <b className="tabular">{streamer.rafflesHosted}</b>
                      </div>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="panel side-card">
                <h3>Find {streamer.displayName}</h3>
                <ul className="dash-list">
                  <li>
                    <span>Kick</span>
                    <ExternalLink href={streamer.kickUrl} className="link-arrow">
                      Visit
                    </ExternalLink>
                  </li>
                  {(
                    [
                      ['X', streamer.xUrl],
                      ['Instagram', streamer.instagramUrl],
                      ['YouTube', streamer.youtubeUrl],
                    ] as const
                  ).map(([label, url]) => (
                    <li key={label}>
                      <span>{label}</span>
                      <ExternalLink href={url} className="muted">
                        {url === '#' ? 'Coming soon' : 'Visit'}
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
