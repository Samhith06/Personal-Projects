import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipCard } from '@/components/media/cards';
import { MediaGroup } from '@/components/media/MediaPlayer';
import { Icon, PLATFORM_ICON } from '@/components/ui/Icon';
import { EmptyState, PageHero } from '@/components/ui/primitives';
import type { ClipPlatform } from '@/lib/types';
import { clipToMedia, getClips, getStreamers } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Clips',
  description: 'FGDR clips from Kick, YouTube Shorts, Instagram Reels and more — played right here on the site.',
};

export const dynamic = 'force-dynamic';

const PLATFORMS: { value: ClipPlatform | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'kick', label: 'Kick' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
];

export default async function ClipsPage({ searchParams }: PageProps<'/clips'>) {
  const params = await searchParams;
  const platformParam = typeof params.platform === 'string' ? params.platform : 'all';
  const platform = (PLATFORMS.some((p) => p.value === platformParam) ? platformParam : 'all') as ClipPlatform | 'all';
  const creatorParam = typeof params.creator === 'string' ? params.creator : undefined;

  const streamers = await getStreamers();
  const creator = streamers.find((s) => s.id === creatorParam)?.id;
  const clips = await getClips({ platform, streamerId: creator, limit: 60 });

  const byId = new Map(streamers.map((s) => [s.id, s]));
  const media = clips.map((c) => clipToMedia(c, byId.get(c.streamerId)));

  const href = (next: { platform?: string; creator?: string | null }) => {
    const q = new URLSearchParams();
    const p = next.platform ?? platform;
    const c = next.creator === undefined ? creator : next.creator;
    if (p && p !== 'all') q.set('platform', p);
    if (c) q.set('creator', c);
    const s = q.toString();
    return s ? `/clips?${s}` : '/clips';
  };

  return (
    <>
      <PageHero
        eyebrow="Short-form"
        title={
          <>
            FGDR <span className="gold-text">clips</span>
          </>
        }
        lede="The reactions, the near-misses and the moments chat still talks about. Press play — you stay right here."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          <nav className="filter-bar" aria-label="Filter clips">
            <div className="filter-bar__row">
              <span className="filter-bar__label">Platform</span>
              <div className="chips">
                {PLATFORMS.map((p) => (
                  <Link key={p.value} className="chip" href={href({ platform: p.value })} aria-current={platform === p.value ? 'page' : undefined} scroll={false}>
                    {p.value !== 'all' ? <Icon name={PLATFORM_ICON[p.value]} /> : null}
                    {p.label}
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
            <MediaGroup items={media} className="clip-grid">
              {media.map((m, i) => (
                <ClipCard key={m.id} media={m} index={i} category={clips[i].category} monogram={byId.get(m.streamerId)?.monogram ?? 'FG'} />
              ))}
            </MediaGroup>
          ) : (
            <EmptyState title="No clips match" body="Try another platform or creator." icon="film" />
          )}

          <p className="fineprint">
            Some platforms don&apos;t allow their clips to play inside other sites — those open on the original platform instead.
          </p>
        </div>
      </section>
    </>
  );
}
