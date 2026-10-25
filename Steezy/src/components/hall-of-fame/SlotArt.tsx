import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatBet, formatUsd } from '@/lib/format';

/** A stable hue per slot, so the fallback art for one game always looks the same. */
function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const multi = (m: number) => `${m.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`;

/** Slot artwork, or a coloured tile with the slot's initials when there's no picture. */
export function SlotThumb({ name, image, size = 36 }: { name: string; image: string | null; size?: number }) {
  return image ? (
    <img className="slot-thumb" src={image} alt="" width={size} height={size} loading="lazy" />
  ) : (
    <span className="slot-thumb slot-thumb--ph" style={{ width: size, height: size, ['--hue' as string]: hueFor(name) } as CSSProperties}>
      {initials(name)}
    </span>
  );
}

export type WinCardProps = {
  multiplier: number;
  gameTitle: string;
  image: string | null;
  name: string;
  handle: string | null;
  day: string;
  wagered: number | null;
  payout: number | null;
};

/** One win club entry: the slot's art full-bleed, the multiplier on top, the player underneath. */
export function WinCard({ multiplier, gameTitle, image, name, handle, day, wagered, payout }: WinCardProps) {
  const date = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <article className={`win-card${image ? '' : ' win-card--ph'}`} style={{ ['--hue' as string]: hueFor(gameTitle) } as CSSProperties}>
      {image ? <img className="win-card__art" src={image} alt="" loading="lazy" /> : <span className="win-card__ph">{initials(gameTitle)}</span>}
      <div className="win-card__shade" />
      <span className="win-card__multi num">{multi(multiplier)}</span>
      <div className="win-card__body">
        <span className="win-card__game">{gameTitle}</span>
        <span className="win-card__player">
          {handle ? <Link href={`/u/${encodeURIComponent(handle)}`}>{name}</Link> : name}
        </span>
        <span className="win-card__meta num">
          {wagered !== null && payout !== null ? `${formatBet(wagered)} bet · ${formatUsd(payout)} paid · ` : ''}
          {date}
        </span>
      </div>
    </article>
  );
}
