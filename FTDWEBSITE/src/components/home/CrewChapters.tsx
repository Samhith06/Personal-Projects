import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Medallion, SocialLinks } from '@/components/ui/primitives';
import { usd } from '@/lib/format';
import type { Streamer } from '@/server/db/schema';
import { CrewLiveBadge } from './CrewLiveBadge';

/**
 * "The crew" as a set of editorial chapters: portrait on one side, story on
 * the other, alternating down the page.
 */
export function CrewChapters({ streamers }: { streamers: Streamer[] }) {
  return (
    <ol className="chapters">
      {streamers.map((s, i) => {
        const n = String(i + 1).padStart(2, '0');
        return (
          <li key={s.id} className={`chapter accent-${s.accent} ${i % 2 ? 'chapter--flip' : ''}`}>
            <div className="chapter__visual reveal">
              <span className="chapter__num" aria-hidden="true">
                {n}
              </span>
              <Link href={`/streamers/${s.id}`} className="chapter__portrait" tabIndex={-1} aria-hidden="true">
                {s.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.portraitUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="chapter__art">
                    <span className="chapter__rings" />
                    <Medallion monogram={s.monogram} imageUrl={s.avatarUrl} accent={s.accent} size="xxl" />
                    <span className="chapter__art-name">{s.displayName}</span>
                  </span>
                )}
                <span className="chapter__shade" />
              </Link>
            </div>

            <div className="chapter__body reveal" style={{ ['--reveal-delay' as string]: '120ms' }}>
              <p className="chapter__kicker">
                Chapter {n}
                {s.chapterTitle ? ` — ${s.chapterTitle}` : ''}
              </p>
              <h3 className="chapter__name">{s.displayName}</h3>
              {s.quote ? <p className="chapter__quote">“{s.quote}”</p> : null}
              <p className="chapter__bio">{s.bio}</p>

              <div className="chapter__pills">
                {s.specialty ? <span className="pill">{s.specialty}</span> : null}
                {s.biggestWin ? (
                  <span className="pill pill--gold">
                    Biggest win · {usd(s.biggestWin)}
                    {s.biggestWinGame ? ` — ${s.biggestWinGame}` : ''}
                  </span>
                ) : null}
              </div>

              <div className="chapter__actions">
                <CrewLiveBadge streamerId={s.id} />
                <Link className="btn btn--gold btn--sm" href={`/streamers/${s.id}`}>
                  View profile
                  <Icon name="arrow-right" />
                </Link>
              </div>

              <SocialLinks streamer={s} size="sm" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
