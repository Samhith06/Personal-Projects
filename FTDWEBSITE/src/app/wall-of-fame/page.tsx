import type { Metadata } from 'next';
import Link from 'next/link';
import { FameCard } from '@/components/media/cards';
import { MediaGroup } from '@/components/media/MediaPlayer';
import { Counter } from '@/components/ui/client';
import { EmptyState, PageHero } from '@/components/ui/primitives';
import { getStreamers, getWins, winToMedia } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Wall of Fame',
  description: 'The FGDR trophy room — the biggest wins and most legendary moments in the crew’s history.',
};

export const dynamic = 'force-dynamic';

const SORTS = [
  { value: 'payout', label: 'Biggest payout' },
  { value: 'multiplier', label: 'Top multiplier' },
  { value: 'latest', label: 'Latest' },
] as const;

type Sort = (typeof SORTS)[number]['value'];

export default async function WallOfFamePage({ searchParams }: PageProps<'/wall-of-fame'>) {
  const params = await searchParams;
  const sort: Sort = SORTS.some((s) => s.value === params.sort) ? (params.sort as Sort) : 'payout';
  const streamers = await getStreamers();
  const creator = streamers.find((s) => s.id === params.creator)?.id;

  const [wins, allWins] = await Promise.all([getWins({ sort, streamerId: creator, limit: 60 }), getWins({ limit: 500 })]);
  const byId = new Map(streamers.map((s) => [s.id, s]));
  const media = wins.map((w) => winToMedia(w, byId.get(w.streamerId)));

  const total = allWins.reduce((a, w) => a + w.payout, 0);
  const biggest = allWins.reduce((a, w) => Math.max(a, w.payout), 0);
  const maxWins = allWins.filter((w) => w.kind === 'max-win' || w.kind === 'legendary').length;

  const href = (next: { sort?: string; creator?: string | null }) => {
    const q = new URLSearchParams();
    const s = next.sort ?? sort;
    const c = next.creator === undefined ? creator : next.creator;
    if (s !== 'payout') q.set('sort', s);
    if (c) q.set('creator', c);
    const str = q.toString();
    return str ? `/wall-of-fame?${str}` : '/wall-of-fame';
  };

  return (
    <>
      <PageHero
        eyebrow="Digital trophy room"
        title={
          <>
            Wall of <span className="gold-sheen">Fame</span>
          </>
        }
        lede="The hits that became legend. Every entry is verified against the stream it happened on."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          <dl className="stat-row trophy-stats reveal">
            <div className="stat">
              <dt className="stat__label">Legendary moments</dt>
              <dd className="stat__value">
                <Counter value={allWins.length} />
              </dd>
            </div>
            <div className="stat">
              <dt className="stat__label">Max &amp; legendary wins</dt>
              <dd className="stat__value">
                <Counter value={maxWins} />
              </dd>
            </div>
            <div className="stat">
              <dt className="stat__label">Biggest single hit</dt>
              <dd className="stat__value gold-text">
                <Counter value={biggest} format="currency" />
              </dd>
            </div>
            <div className="stat">
              <dt className="stat__label">Total on the wall</dt>
              <dd className="stat__value">
                <Counter value={total} format="currency" />
              </dd>
            </div>
          </dl>

          <nav className="filter-bar" aria-label="Sort and filter wins">
            <div className="filter-bar__row">
              <span className="filter-bar__label">Sort</span>
              <div className="chips">
                {SORTS.map((s) => (
                  <Link key={s.value} className="chip" href={href({ sort: s.value })} aria-current={sort === s.value ? 'page' : undefined} scroll={false}>
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="filter-bar__row">
              <span className="filter-bar__label">Creator</span>
              <div className="chips">
                <Link className="chip" href={href({ creator: null })} aria-current={!creator ? 'page' : undefined} scroll={false}>
                  Everyone
                </Link>
                {streamers.map((s) => (
                  <Link key={s.id} className="chip" href={href({ creator: s.id })} aria-current={creator === s.id ? 'page' : undefined} scroll={false}>
                    {s.displayName}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {media.length ? (
            <MediaGroup items={media} className="fame-page">
              <div className="fame-hero">
                <FameCard media={media[0]} index={0} kind={wins[0].kind} size="lg" rank={1} monogram={byId.get(media[0].streamerId)?.monogram ?? 'FG'} />
              </div>
              <div className="fame-grid">
                {media.slice(1).map((m, i) => (
                  <FameCard
                    key={m.id}
                    media={m}
                    index={i + 1}
                    kind={wins[i + 1].kind}
                    rank={i + 2}
                    monogram={byId.get(m.streamerId)?.monogram ?? 'FG'}
                  />
                ))}
              </div>
            </MediaGroup>
          ) : (
            <EmptyState title="No wins yet" body="Legendary moments will appear here once verified." icon="crown" />
          )}

          <p className="fineprint">
            These are rare, exceptional results — not typical outcomes. Most gambling sessions lose money. 18+ only; please
            gamble responsibly.
          </p>
        </div>
      </section>
    </>
  );
}
