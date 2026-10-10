import type { Metadata } from 'next';
import Link from 'next/link';
import { Counter, RelativeTime } from '@/components/ui/client';
import { Icon } from '@/components/ui/Icon';
import { ExternalLink, PageHero, SectionHeader } from '@/components/ui/primitives';
import { dateLabel, relativeTime } from '@/lib/format';
import { getActivity, getAnnouncements, getCommunityStats, getSiteSettings } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Announcements, winners and the latest from the FGDR community.',
};

export const dynamic = 'force-dynamic';

export default async function CommunityPage() {
  const [announcements, activity, stats, settings] = await Promise.all([
    getAnnouncements(10),
    getActivity(20),
    getCommunityStats(),
    getSiteSettings(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Members club"
        title={
          <>
            The FGDR <span className="gold-text">community</span>
          </>
        }
        lede="Announcements, winners and everything happening around the crew."
      >
        <ExternalLink href={settings.discordUrl} className="btn btn--discord">
          <Icon name="discord" />
          Join the Discord
        </ExternalLink>
      </PageHero>

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          <dl className="stat-row reveal" style={{ marginBottom: 'clamp(3.5rem, 3rem + 3vw, 6rem)' }}>
            {stats.map((s) => (
              <div className="stat" key={s.key}>
                <dt className="stat__label">{s.label}</dt>
                <dd className="stat__value">
                  <Counter value={s.value} format={s.format} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="community-layout">
            <div>
              <SectionHeader eyebrow="Announcements" title="From the crew" />
              <div className="announce-list">
                {/* Nothing posted yet reads better than a heading over empty space. */}
                {announcements.length === 0 ? (
                  <p className="adm-empty">
                    No announcements yet. The crew posts updates here — check back after the next stream.
                  </p>
                ) : null}
                {announcements.map((a) => (
                  <article key={a.id} className={`announce reveal ${a.isFeatured ? 'frame-gold' : 'panel'}`}>
                    <p className="eyebrow">
                      {a.kicker} · {dateLabel(a.publishedAt, 'UTC')}
                    </p>
                    <h3 className="announce__title">{a.title}</h3>
                    <p className="announce__body">{a.body}</p>
                    {a.ctaHref ? (
                      <Link className="link-arrow" href={a.ctaHref}>
                        {a.ctaLabel ?? 'Find out more'}
                        <Icon name="arrow-right" />
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            <aside>
              <div className="panel side-card reveal" style={{ position: 'sticky', top: 'calc(var(--header-h) + 1.5rem)' }}>
                <h3>Community activity</h3>
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
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
