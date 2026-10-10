'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LiveDot, Medallion, StatusBadge } from '@/components/ui/primitives';
import { compact, duration } from '@/lib/format';
import { useLive } from './LiveProvider';
import type { LiveCardStreamer } from './StreamerLiveCard';

/**
 * The live hub: plays whichever FGDR creator is live right now, inside the
 * site, and lets viewers switch between the crew. It follows live status as
 * it changes (someone goes live → the player switches to them) until the
 * viewer picks a channel themselves.
 */
export function LiveHub({ streamers }: { streamers: LiveCardStreamer[] }) {
  const live = useLive();

  const liveNow = useMemo(
    () =>
      streamers
        .filter((s) => live[s.id]?.isLive)
        // Primary channel first, then the biggest audience.
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (live[b.id]?.viewers ?? 0) - (live[a.id]?.viewers ?? 0)),
    [streamers, live],
  );

  // Nobody live: fall back to the primary channel, then simply the first.
  const autoPick = liveNow[0]?.id ?? streamers.find((s) => s.isPrimary)?.id ?? streamers[0]?.id;
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? autoPick;

  // If the viewer's pick goes offline while someone else is live, follow the live one.
  useEffect(() => {
    if (picked && !live[picked]?.isLive && liveNow.length) setPicked(null);
  }, [picked, live, liveNow.length]);

  const current = streamers.find((s) => s.id === selected) ?? streamers[0];
  const state = current ? live[current.id] : undefined;
  const isLive = Boolean(state?.isLive);

  const [uptime, setUptime] = useState<string | null>(null);
  useEffect(() => {
    if (!state?.startedAt || !isLive) return setUptime(null);
    const update = () => setUptime(duration((Date.now() - new Date(state.startedAt!).getTime()) / 60_000));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [state?.startedAt, isLive]);

  if (!current) return null;

  const avatar = (s: LiveCardStreamer) => s.avatarUrl ?? live[s.id]?.avatarUrl ?? null;
  const nobodyLive = liveNow.length === 0;

  return (
    <div className="live-hub">
      <div className="live-stage">
        <div className="live-stage__player">
          {isLive ? (
            <iframe
              key={current.kickUsername}
              src={`https://player.kick.com/${encodeURIComponent(current.kickUsername)}?autoplay=true&muted=true`}
              title={`${current.displayName} live on Kick`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="live-stage__offline">
              {state?.offlineBannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="live-stage__banner" src={state.offlineBannerUrl} alt="" loading="lazy" />
              ) : null}
              <div className="live-stage__offline-body">
                <Medallion monogram={current.monogram} imageUrl={avatar(current)} accent={current.accent} size="xl" />
                <p className="eyebrow eyebrow--center">{nobodyLive ? 'Nobody is live right now' : 'Offline right now'}</p>
                <p className="title-md display">{current.displayName}</p>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  The player switches on automatically when the crew goes live.
                </p>
                <a className="btn btn--ghost btn--sm" href={current.kickUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="kick" />
                  Follow on Kick
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="live-stage__meta">
          <div className="live-stage__who">
            <Medallion monogram={current.monogram} imageUrl={avatar(current)} accent={current.accent} size="md" live={isLive} />
            <div>
              <p className="live-stage__title">{isLive ? (state?.title ?? 'Live on Kick') : current.displayName}</p>
              <p className="live-stage__sub">
                <span>
                  <StatusBadge live={isLive} />
                </span>
                <Link href={`/streamers/${current.id}`}>{current.displayName}</Link>
                {isLive && state?.viewers ? (
                  <span>
                    <Icon name="eye" />
                    {compact(state.viewers)} watching
                  </span>
                ) : null}
                {isLive && uptime ? (
                  <span>
                    <Icon name="clock" />
                    {uptime}
                  </span>
                ) : null}
                {isLive && state?.category ? <span>{state.category}</span> : null}
              </p>
            </div>
          </div>
          <a className="btn btn--gold btn--sm" href={current.kickUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="kick" />
            Open on Kick
          </a>
        </div>
      </div>

      <aside aria-label="Switch channel">
        <p className="kicker" style={{ marginBottom: '1rem' }}>
          {nobodyLive ? 'The crew · all offline' : `The crew · ${liveNow.length} live`}
        </p>
        <div className="live-switch">
          {[...liveNow, ...streamers.filter((s) => !live[s.id]?.isLive)].map((s) => {
            const st = live[s.id];
            return (
              <button
                key={s.id}
                type="button"
                className="live-switch__item"
                aria-pressed={s.id === current.id}
                onClick={() => setPicked(s.id)}
              >
                <Medallion monogram={s.monogram} imageUrl={avatar(s)} accent={s.accent} size="sm" live={st?.isLive} />
                <span className="live-switch__body">
                  <span className="live-switch__name">{s.displayName}</span>
                  <span className="live-switch__title">{st?.isLive ? (st.title ?? 'Live now') : 'Offline'}</span>
                </span>
                {st?.isLive ? (
                  <span className="live-switch__viewers tabular">
                    <LiveDot /> {st.viewers ? compact(st.viewers) : ''}
                  </span>
                ) : (
                  <span className="status status--offline">Off</span>
                )}
              </button>
            );
          })}
        </div>
        {state?.source === 'mock' ? (
          <p className="notice" style={{ marginTop: '1.25rem' }}>
            <Icon name="info" />
            Kick is unreachable right now — showing sample live status.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
