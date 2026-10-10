import Image from 'next/image';
import Link from 'next/link';
import { Icon, PLATFORM_ICON, PLATFORM_LABEL } from '@/components/ui/Icon';
import { Medallion } from '@/components/ui/primitives';
import { clock, compact, dateLabel, multiplier, usd } from '@/lib/format';
import type { PlayableMedia } from '@/lib/types';
import { MediaArt } from './MediaArt';

const CATEGORY_LABEL: Record<string, string> = {
  'big-win': 'Big win',
  highlight: 'Highlight',
  funny: 'Funny',
  community: 'Community',
};

const KIND_LABEL: Record<string, string> = {
  'max-win': 'Max win',
  'big-win': 'Big win',
  legendary: 'Legendary',
  community: 'Community moment',
};

function Thumb({
  media,
  sizes,
  label,
  variant,
  priority,
}: {
  media: PlayableMedia;
  sizes: string;
  label?: string;
  variant: 'clip' | 'win';
  priority?: boolean;
}) {
  if (media.thumbnailUrl) {
    return <Image src={media.thumbnailUrl} alt="" fill sizes={sizes} className="media-thumb__img" priority={priority} />;
  }
  return <MediaArt seed={media.id} accent={media.accent} label={label} variant={variant} orientation={media.orientation} />;
}

/* -------------------------------------------------------------------- Clip */

export function ClipCard({
  media,
  index,
  category,
  monogram,
  size = 'md',
}: {
  media: PlayableMedia;
  index: number;
  category?: string;
  monogram: string;
  size?: 'md' | 'lg';
}) {
  const portrait = media.orientation === 'portrait';
  return (
    <article className={`clip-card clip-card--${size} ${portrait ? 'clip-card--portrait' : ''} accent-${media.accent}`}>
      <button type="button" className="clip-card__media media-thumb" data-media-index={index} aria-label={`Play: ${media.title}`}>
        <Thumb media={media} sizes={size === 'lg' ? '(max-width: 900px) 100vw, 60vw' : '(max-width: 700px) 80vw, 30vw'} variant="clip" />
        <span className="media-thumb__shade" aria-hidden="true" />
        <span className="clip-card__top" aria-hidden="true">
          <span className={`platform-pill platform-pill--${media.platform}`}>
            <Icon name={PLATFORM_ICON[media.platform] ?? 'film'} />
            {PLATFORM_LABEL[media.platform]}
          </span>
          {media.durationSec ? <span className="clip-card__dur tabular">{clock(media.durationSec)}</span> : null}
        </span>
        <span className="play-orb" aria-hidden="true">
          <Icon name="play" />
        </span>
      </button>

      <div className="clip-card__body">
        <div className="clip-card__tags">
          {category ? <span className="tag">{CATEGORY_LABEL[category] ?? category}</span> : null}
          {media.views ? (
            <span className="clip-card__views">
              <Icon name="eye" />
              {compact(media.views)}
            </span>
          ) : null}
        </div>
        <h3 className="clip-card__title">{media.title}</h3>
        <p className="clip-card__byline">
          <Medallion monogram={monogram} accent={media.accent} size="xs" />
          <Link href={`/streamers/${media.streamerId}`} className="clip-card__creator">
            {media.streamerName}
          </Link>
          <span className="muted">· {dateLabel(media.publishedAt, 'UTC')}</span>
        </p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ Wall of Fame */

export function FameCard({
  media,
  index,
  kind,
  monogram,
  size = 'md',
  rank,
}: {
  media: PlayableMedia;
  index: number;
  kind: string;
  monogram: string;
  size?: 'md' | 'lg' | 'row';
  rank?: number;
}) {
  const payout = media.payout ?? 0;
  const bet = media.bet ?? 0;
  const prestige = kind === 'max-win' || kind === 'legendary';

  return (
    <article className={`fame-card fame-card--${size} ${prestige ? 'is-prestige' : ''} accent-${media.accent}`}>
      <button type="button" className="fame-card__hit" data-media-index={index} aria-label={`Play ${usd(payout)} win by ${media.streamerName} on ${media.game}`}>
        <span className="fame-card__media media-thumb">
          <Thumb media={media} sizes={size === 'lg' ? '(max-width: 900px) 100vw, 55vw' : '(max-width: 700px) 90vw, 30vw'} variant="win" />
          <span className="media-thumb__shade" aria-hidden="true" />
          <span className="play-orb" aria-hidden="true">
            <Icon name="play" />
          </span>
        </span>

        <span className="fame-card__plate">
          {rank ? (
            <span className="fame-card__rank" aria-hidden="true">
              {String(rank).padStart(2, '0')}
            </span>
          ) : null}
          <span className={`tag ${prestige ? 'tag--gold' : ''}`}>
            {prestige ? <Icon name="crown" /> : <Icon name="trophy" />}
            {KIND_LABEL[kind] ?? kind}
          </span>
          <span className="fame-card__amount">
            <span className="gold-text">{usd(payout)}</span>
          </span>
          <span className="fame-card__creator">
            <Medallion monogram={monogram} accent={media.accent} size="xs" />
            {media.streamerName}
          </span>
          <span className="fame-card__meta">
            <span>{media.game}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular">{multiplier(payout, bet)}</span>
            <span aria-hidden="true">·</span>
            <span>{dateLabel(media.publishedAt, 'UTC')}</span>
          </span>
          {size !== 'row' && media.description ? <span className="fame-card__desc">{media.description}</span> : null}
        </span>
      </button>
    </article>
  );
}
