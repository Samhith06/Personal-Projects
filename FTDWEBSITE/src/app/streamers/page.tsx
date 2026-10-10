import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Medallion, PageHero, SocialLinks } from '@/components/ui/primitives';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { compact, usd } from '@/lib/format';
import { getStreamers } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Streamers',
  description: "Meet the creators behind FGDR — FatGuysDontRun, Insane Tigers 7, Still Making Gains, Dallas Ghost and DaddyKong Gaming.",
};

export const dynamic = 'force-dynamic';

export default async function StreamersPage() {
  const streamers = await getStreamers();

  return (
    <>
      <PageHero
        eyebrow="The crew"
        title={
          <>
            The crew. <span className="gold-text">One table.</span>
          </>
        }
        lede="Different styles, different hours, the same table."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container roster">
          {streamers.map((s, i) => (
            <article key={s.id} className={`roster-card accent-${s.accent} reveal`}>
              <span className="roster-card__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Medallion monogram={s.monogram} imageUrl={s.avatarUrl} accent={s.accent} size="xl" />
              <div className="roster-card__body">
                <p className="eyebrow">{s.role}</p>
                <h2 className="roster-card__name">
                  <Link href={`/streamers/${s.id}`}>{s.displayName}</Link>
                </h2>
                <p className="roster-card__bio">{s.bio}</p>
                <p className="roster-card__row">
                  <LiveStatusBadge streamerId={s.id} />
                  {s.followers > 0 ? (
                    <span>
                      <b className="tabular">{compact(s.followers)}</b> followers
                    </span>
                  ) : null}
                  {s.avgViewers > 0 ? (
                    <span>
                      <b className="tabular">{compact(s.avgViewers)}</b> avg viewers
                    </span>
                  ) : null}
                  {s.biggestWin > 0 ? (
                    <span>
                      <b className="tabular">{usd(s.biggestWin)}</b> biggest win
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="roster-card__side">
                <SocialLinks streamer={s} size="sm" />
                <span className="link-arrow">
                  View profile
                  <Icon name="arrow-right" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
