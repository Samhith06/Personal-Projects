import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { GiveawayTotal, WinnerSlider } from '@/components/giveaways/GiveawayBoard';
import { CrewChapters } from '@/components/home/CrewChapters';
import { HeroVideo } from '@/components/home/HeroVideo';
import { LiveHub } from '@/components/live/LiveHub';
import { ClipCard, FameCard } from '@/components/media/cards';
import { MediaGroup } from '@/components/media/MediaPlayer';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/client';
import { ArrowLink, SectionHeader } from '@/components/ui/primitives';
import { hasLogoAsset } from '@/lib/brand';
import { num, relativeTime } from '@/lib/format';
import {
  clipToMedia,
  getActivity,
  getFeaturedAnnouncement,
  getFeaturedClips,
  getFeaturedWins,
  getGiveawayTotal,
  getGiveaways,
  getSiteSettings,
  getStreamers,
  winToMedia,
} from '@/server/services/content';
import { toGiveawayWinners, toLiveCardStreamers } from '@/server/services/views';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [settings, streamers, clips, wins, announcement, activity, giveawaySummary, giveawayRows] =
    await Promise.all([
      getSiteSettings(),
      getStreamers(),
      getFeaturedClips(4),
      getFeaturedWins(3),
      getFeaturedAnnouncement(),
      getActivity(4),
      getGiveawayTotal(),
      getGiveaways(12),
    ]);

  const byId = new Map(streamers.map((s) => [s.id, s]));

  const liveCards = toLiveCardStreamers(streamers);
  const giveawayWinners = toGiveawayWinners(giveawayRows, streamers);

  const clipMedia = clips.map((c) => clipToMedia(c, byId.get(c.streamerId)));
  const winMedia = wins.map((w) => winToMedia(w, byId.get(w.streamerId)));

  return (
    <>
      {/* ================================================================ HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <HeroVideo
          src={settings.heroVideoUrl}
          desktopSrc="/media/hero2-1920.mp4"
          mobileSrc="/media/hero2-960.mp4"
          poster={settings.heroPosterUrl || '/brand/hero2-poster.jpg'}
          mobilePoster="/brand/hero2-poster-960.jpg"
        />

        <div className="hero__content container">
          <div className="hero__logo">
            <Logo hasLogoAsset={hasLogoAsset} size={180} priority sweep />
          </div>
          <h1 className="hero__title" id="hero-title">
            <span className="hero__fgdr gold-sheen">FGDR</span>
            <span className="hero__name">{settings.heroTitle}</span>
          </h1>
          <p className="hero__tagline">{settings.heroTagline}</p>
          <div className="hero__cta">
            <Link className="btn btn--gold btn--lg" href="/live">
              <span className="live-dot" aria-hidden="true" />
              Watch live
            </Link>
            <a className="btn btn--ghost btn--lg" href="#live">
              Explore FGDR
            </a>
          </div>
        </div>

        <a className="hero__scroll" href="#live">
          <span>Explore FGDR</span>
          <span className="hero__scroll-line" aria-hidden="true" />
        </a>
      </section>

      {/* ============================================================ LIVE NOW */}
      <section className="section home-live" id="live" aria-labelledby="live-title">
        <div className="container">
          <SectionHeader
            id="live-title"
            eyebrow="On Kick"
            title={
              <>
                Live <span className="gold-text">now</span>
              </>
            }
            action={<ArrowLink href="/live">Open the live hub</ArrowLink>}
          />
          <div className="reveal">
            <LiveHub streamers={liveCards} />
          </div>
        </div>
      </section>

      {/* ============================================================ THE CREW */}
      <section className="section home-crew" id="crew" aria-labelledby="crew-title">
        <div className="container">
          <SectionHeader
            id="crew-title"
            eyebrow="The crew"
            title="The crew"
            lede="Every creator, every style, one shared table. Meet the people behind FGDR."
          />
          <CrewChapters streamers={streamers} />
        </div>
      </section>

      {/* ==================================================== FEATURED CONTENT */}
      {clipMedia.length ? (
        <section className="section home-clips" aria-labelledby="clips-title">
          <div className="container">
            <SectionHeader
              id="clips-title"
              eyebrow="Featured content"
              title={
                <>
                  The <span className="gold-text">best</span> of FGDR
                </>
              }
              lede="Hand-picked moments from Kick, YouTube, Instagram and beyond. Press play — it stays right here."
              action={<ArrowLink href="/clips">View all clips</ArrowLink>}
            />
            <MediaGroup items={clipMedia} className="clip-showcase reveal">
              {clipMedia.map((m, i) => (
                <ClipCard
                  key={m.id}
                  media={m}
                  index={i}
                  size={i === 0 ? 'lg' : 'md'}
                  category={clips[i].category}
                  monogram={byId.get(m.streamerId)?.monogram ?? 'FG'}
                />
              ))}
            </MediaGroup>
          </div>
        </section>
      ) : null}

      {/* ======================================================== WALL OF FAME */}
      {winMedia.length ? (
        <section className="section home-fame" aria-labelledby="fame-title">
          <div className="home-fame__backdrop" aria-hidden="true" />
          <div className="container">
            <SectionHeader
              id="fame-title"
              eyebrow="Wall of Fame"
              align="center"
              title={
                <>
                  The <span className="gold-text">trophy room</span>
                </>
              }
              lede="The biggest hits in FGDR history. Rare, exceptional results — never typical ones."
            />
            <MediaGroup items={winMedia} className="fame-showcase reveal">
              {winMedia.map((m, i) => (
                <FameCard
                  key={m.id}
                  media={m}
                  index={i}
                  kind={wins[i].kind}
                  size={i === 0 ? 'lg' : 'md'}
                  monogram={byId.get(m.streamerId)?.monogram ?? 'FG'}
                />
              ))}
            </MediaGroup>
            <div className="sec-foot">
              <Link className="btn btn--ghost btn--lg" href="/wall-of-fame">
                <Icon name="crown" />
                Explore the Wall of Fame
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* =========================================================== GIVEAWAYS */}
      {/* Nothing logged and no starting figure: there is no number worth showing yet. */}
      {giveawaySummary.total > 0 ? (
      <section className="section home-giveaways" aria-labelledby="giveaways-title">
        <div className="container">
          <SectionHeader
            id="giveaways-title"
            eyebrow="Given back"
            align="center"
            title={
              <>
                Straight back to <span className="gold-text">the community</span>
              </>
            }
          />

          <div className="gv-total gv-total--home reveal">
            <span className="gv-total__glow" aria-hidden="true" />
            <p className="gv-total__label">Total given away</p>
            <GiveawayTotal total={giveawaySummary.total} />
            <p className="gv-total__sub">
              across {num(giveawaySummary.count)} logged {giveawaySummary.count === 1 ? 'payout' : 'payouts'}
            </p>
          </div>

          {giveawayWinners.length ? (
            <div className="reveal" style={{ marginTop: 'clamp(2rem, 1.5rem + 1.5vw, 3rem)' }}>
              <p className="kicker" style={{ marginBottom: '1rem' }}>
                Last winners
              </p>
              <WinnerSlider winners={giveawayWinners} />
            </div>
          ) : null}

          <div className="sec-foot">
            <Link className="btn btn--ghost btn--lg" href="/giveaways">
              <Icon name="gift" />
              See the whole board
            </Link>
          </div>
        </div>
      </section>
      ) : null}

      {/* =========================================================== COMMUNITY */}
      <section className="section home-community" aria-labelledby="community-title">
        <div className="container">
          <SectionHeader
            id="community-title"
            eyebrow="Community"
            title={
              <>
                Inside the <span className="gold-text">club</span>
              </>
            }
            action={<ArrowLink href="/community">Community hub</ArrowLink>}
          />

          <div className="community-grid">
            {announcement ? (
              <div className="reveal">
                <article className="announce frame-gold">
                  <p className="eyebrow">{announcement.kicker}</p>
                  <h3 className="announce__title">{announcement.title}</h3>
                  <p className="announce__body">{announcement.body}</p>
                  {announcement.ctaHref ? (
                    <Link className="link-arrow" href={announcement.ctaHref}>
                      {announcement.ctaLabel ?? 'Find out more'}
                      <Icon name="arrow-right" />
                    </Link>
                  ) : null}
                </article>
              </div>
            ) : null}

            <div className="reveal" style={{ ['--reveal-delay' as string]: '120ms' }}>
              <div className="feed-mini panel">
                <p className="kicker">Latest activity</p>
                <ul className="feed">
                  {activity.map((a) => (
                    <li key={a.id} className={`feed__item feed__item--${a.type}`}>
                      <span className="feed__dot" aria-hidden="true" />
                      <div>
                        {a.href ? (
                          <Link href={a.href} className="feed__title">
                            {a.title}
                          </Link>
                        ) : (
                          <p className="feed__title">{a.title}</p>
                        )}
                        <p className="feed__meta">
                          {a.tag} · <RelativeTime value={a.occurredAt.toISOString()} fallback={relativeTime(a.occurredAt)} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p className="fineprint">
            18+ only. Please gamble responsibly.
          </p>
        </div>
      </section>
    </>
  );
}
