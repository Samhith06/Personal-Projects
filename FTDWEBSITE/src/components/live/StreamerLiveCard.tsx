'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LiveDot, Medallion, StatusBadge } from '@/components/ui/primitives';
import { compact, duration, num } from '@/lib/format';
import { useLive } from './LiveProvider';

export type LiveCardStreamer = {
  id: string;
  displayName: string;
  monogram: string;
  role: string;
  accent: string;
  isPrimary: boolean;
  kickUsername: string;
  kickUrl: string;
  avatarUrl: string | null;
};

function useUptime(startedAt: string | null) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!startedAt) return setText(null);
    const update = () => setText(duration((Date.now() - new Date(startedAt).getTime()) / 60_000));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [startedAt]);
  return text;
}

/** Compact live card used on the homepage and the live hub. */
export function StreamerLiveCard({ streamer, variant = 'compact' }: { streamer: LiveCardStreamer; variant?: 'compact' | 'hub' }) {
  const live = useLive()[streamer.id];
  const isLive = Boolean(live?.isLive);
  const uptime = useUptime(isLive ? (live?.startedAt ?? null) : null);

  return (
    <article
      className={`live-card live-card--${variant} accent-${streamer.accent} ${isLive ? 'is-live' : 'is-offline'} ${streamer.isPrimary ? 'is-primary' : ''}`}
    >
      <div className="live-card__halo" aria-hidden="true" />

      <header className="live-card__head">
        <StatusBadge live={isLive} />
        {isLive && live?.viewers ? (
          <span className="live-card__viewers tabular" aria-label={`${num(live.viewers)} watching`}>
            <Icon name="eye" />
            {compact(live.viewers)}
          </span>
        ) : (
          <span className="live-card__platform" aria-label="Streams on Kick">
            <Icon name="kick" />
          </span>
        )}
      </header>

      <div className="live-card__id">
        <Medallion monogram={streamer.monogram} imageUrl={streamer.avatarUrl} accent={streamer.accent} size="lg" live={isLive} />
        <div>
          <h3 className="live-card__name">
            <Link href={`/streamers/${streamer.id}`}>{streamer.displayName}</Link>
          </h3>
          <p className="live-card__role">{streamer.role}</p>
        </div>
      </div>

      <div className="live-card__now">
        {isLive ? (
          <>
            <p className="live-card__label">
              <LiveDot /> Streaming now
              {uptime ? <span className="muted"> · {uptime}</span> : null}
            </p>
            <p className="live-card__title">{live?.title ?? 'Live on Kick'}</p>
            {live?.category ? <p className="live-card__cat">{live.category}</p> : null}
          </>
        ) : (
          <>
            <p className="live-card__label">Currently offline</p>
            <p className="live-card__title live-card__title--muted">Back live soon — follow on Kick for the alert</p>
          </>
        )}
      </div>

      <footer className="live-card__foot">
        <a
          className={`btn ${isLive ? 'btn--gold' : 'btn--ghost'} btn--sm btn--block`}
          href={streamer.kickUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="kick" />
          {isLive ? 'Watch live' : 'Visit channel'}
          <span className="sr-only"> — {streamer.displayName} on Kick (opens in a new tab)</span>
        </a>
      </footer>
    </article>
  );
}
