import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { isPlaceholderUrl, percent } from '@/lib/format';

/* ------------------------------------------------------------------ Medallion */

export function Medallion({
  monogram,
  imageUrl,
  accent = 'gold',
  size = 'md',
  ring = 'gold',
  live = false,
  label,
}: {
  monogram: string;
  imageUrl?: string | null;
  accent?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  ring?: 'gold' | 'silver' | 'bronze' | 'steel';
  live?: boolean;
  label?: string;
}) {
  return (
    <span
      className={`medallion medallion--${size} accent-${accent} ${ring !== 'gold' ? `medallion--${ring}` : ''} ${live ? 'is-live' : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="medallion__inner">
        {imageUrl ? (
          // Remote avatars are small and already CDN-optimised.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="medallion__mono">{monogram}</span>
        )}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------------- Status */

export function LiveDot() {
  return <span className="live-dot" aria-hidden="true" />;
}

export function StatusBadge({ live }: { live: boolean }) {
  return live ? (
    <span className="status status--live">
      <LiveDot />
      Live
    </span>
  ) : (
    <span className="status status--offline">Offline</span>
  );
}

/* ------------------------------------------------------------------- Progress */

export function ProgressBar({
  value,
  max,
  label,
  tone = 'gold',
  size,
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'gold' | 'cyan' | 'steel';
  size?: 'thin' | 'lg';
}) {
  const p = percent(value, max);
  return (
    <div
      className={`progress progress--${tone} ${size ? `progress--${size}` : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p)}
      data-animate=""
      style={{ ['--p' as string]: `${p.toFixed(2)}%` }}
    >
      <span className="progress__fill" />
    </div>
  );
}

/* ------------------------------------------------------------------- Movement */

export function Movement({ value }: { value: number | null }) {
  if (value === null) return <span className="move move--new">New</span>;
  if (value === 0)
    return (
      <span className="move move--flat" aria-label="No change">
        —
      </span>
    );
  const up = value > 0;
  return (
    <span className={`move move--${up ? 'up' : 'down'}`} aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(value)}`}>
      <Icon name={up ? 'caret-up' : 'caret-down'} />
      {Math.abs(value)}
    </span>
  );
}

/* ------------------------------------------------------------ Section header */

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = 'left',
  action,
  id,
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  id?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <header className={`sec-head reveal ${align === 'center' ? 'sec-head--center' : ''}`}>
      <div className="sec-head__copy">
        {eyebrow ? <p className={`eyebrow ${align === 'center' ? 'eyebrow--center' : ''}`}>{eyebrow}</p> : null}
        <Tag className="sec-title" id={id}>
          {title}
        </Tag>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {action ? <div className="sec-head__action">{action}</div> : null}
    </header>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <p className="eyebrow eyebrow--center">{eyebrow}</p>
        <h1 className="display page-hero__title">{title}</h1>
        {lede ? <p className="lede" style={{ marginInline: 'auto' }}>{lede}</p> : null}
        {children ? <div className="page-hero__meta">{children}</div> : null}
      </div>
    </section>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="link-arrow" href={href}>
      {children}
      <Icon name="arrow-right" />
    </Link>
  );
}

/* -------------------------------------------------------------------- Socials */

type SocialSource = {
  displayName: string;
  kickUrl: string;
  xUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
};

export function ExternalLink({
  href,
  className,
  children,
  label,
}: {
  href: string | null | undefined;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  if (isPlaceholderUrl(href)) {
    return (
      <span className={className} aria-label={label ? `${label} (link coming soon)` : undefined} data-placeholder="" title="Coming soon">
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={href!} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

export function SocialLinks({
  streamer,
  includeKick = true,
  size,
}: {
  streamer: SocialSource;
  includeKick?: boolean;
  size?: 'sm';
}) {
  const items: [IconName, string, string][] = [];
  if (includeKick) items.push(['kick', streamer.kickUrl, 'Kick']);
  items.push(['x', streamer.xUrl, 'X'], ['instagram', streamer.instagramUrl, 'Instagram'], ['youtube', streamer.youtubeUrl, 'YouTube']);

  return (
    <ul className={`socials ${size ? `socials--${size}` : ''}`}>
      {items.map(([icon, url, label]) => (
        <li key={icon}>
          <ExternalLink href={url} className={`social social--${icon}`} label={`${streamer.displayName} on ${label}`}>
            <Icon name={icon} />
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------- Empty */

export function EmptyState({ title, body, icon = 'calendar' }: { title: string; body: string; icon?: IconName }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <p className="empty__title">{title}</p>
      <p>{body}</p>
    </div>
  );
}
