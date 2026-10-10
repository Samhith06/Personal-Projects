'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon, PLATFORM_ICON, PLATFORM_LABEL } from '@/components/ui/Icon';
import { clock, compact, dateLabel, multiplier, usd } from '@/lib/format';
import type { PlayableMedia } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

type PlayerState = { items: PlayableMedia[]; index: number } | null;

const PlayerContext = createContext<{
  open: (items: PlayableMedia[], index: number) => void;
} | null>(null);

export function useMediaPlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('useMediaPlayer must be used inside <MediaPlayerProvider>');
  return ctx;
}

/** Mounted once in the root layout. */
export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((items: PlayableMedia[], index: number) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setState({ items, index });
  }, []);

  const close = useCallback(() => {
    setState(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('play')) {
      url.searchParams.delete('play');
      window.history.replaceState(window.history.state, '', url);
    }
    requestAnimationFrame(() => lastFocus.current?.focus?.({ preventScroll: true }));
  }, []);

  const go = useCallback((delta: number) => {
    setState((s) => {
      if (!s) return s;
      const next = s.index + delta;
      if (next < 0 || next >= s.items.length) return s;
      return { ...s, index: next };
    });
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {state ? <PlayerDialog items={state.items} index={state.index} onClose={close} onStep={go} /> : null}
    </PlayerContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Group / trigger                              */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a server-rendered grid of cards. Any descendant with
 * `data-media-index` opens the player at that position, and the group becomes
 * the playlist for next/previous. `?play=<id>` deep-links straight in.
 */
export function MediaGroup({
  items,
  children,
  className,
  as: Tag = 'div',
}: {
  items: PlayableMedia[];
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'ol' | 'section';
}) {
  const { open } = useMediaPlayer();

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('play');
    if (!id) return;
    const index = items.findIndex((m) => m.id === id);
    if (index >= 0) open(items, index);
    // Only on first mount for this playlist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag
      className={className}
      onClick={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-media-index]');
        if (!target || !event.currentTarget.contains(target)) return;
        event.preventDefault();
        open(items, Number(target.dataset.mediaIndex));
      }}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Dialog                                   */
/* -------------------------------------------------------------------------- */

function youtubeAutoplay(url: string) {
  const u = new URL(url);
  u.searchParams.set('autoplay', '1');
  u.searchParams.set('rel', '0');
  u.searchParams.set('modestbranding', '1');
  u.searchParams.set('playsinline', '1');
  return u.toString();
}

function PlayerDialog({
  items,
  index,
  onClose,
  onStep,
}: {
  items: PlayableMedia[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const item = items[index];
  const [shareNote, setShareNote] = useState<string | null>(null);

  // Open as a true modal: focus trap, inert page, Esc handling for free.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('is-locked');
    return () => document.documentElement.classList.remove('is-locked');
  }, []);

  // Deep link the current item.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('play', item.id);
    window.history.replaceState(window.history.state, '', url);
    setShareNote(null);
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStep]);

  const share = async () => {
    const url = window.location.href;
    const title = item.kind === 'win' && item.payout ? `${usd(item.payout)} — ${item.streamerName}` : item.title;
    try {
      if (navigator.share) {
        await navigator.share({ title: `FGDR · ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote('Link copied');
    } catch {
      /* user cancelled */
    }
  };

  const isWin = item.kind === 'win';
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <dialog
      ref={ref}
      className={`player accent-${item.accent} ${item.orientation === 'portrait' ? 'player--portrait' : ''}`}
      aria-labelledby="player-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="player__shell">
        <header className="player__bar">
          <div className="player__source">
            <span className={`platform-pill platform-pill--${item.platform}`}>
              <Icon name={PLATFORM_ICON[item.platform] ?? 'film'} />
              {isWin ? 'Wall of Fame' : PLATFORM_LABEL[item.platform]}
            </span>
            {items.length > 1 ? (
              <span className="player__count tabular">
                {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
            ) : null}
          </div>
          <div className="player__actions">
            <button type="button" className="icon-btn" onClick={share} aria-label="Share">
              <Icon name="share" />
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close player" autoFocus>
              <Icon name="close" />
            </button>
          </div>
        </header>

        <div className="player__stage">
          <MediaSurface key={item.id} item={item} />

          <button
            type="button"
            className="player__nav player__nav--prev"
            onClick={() => onStep(-1)}
            disabled={!hasPrev}
            aria-label="Previous"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            type="button"
            className="player__nav player__nav--next"
            onClick={() => onStep(1)}
            disabled={!hasNext}
            aria-label="Next"
          >
            <Icon name="chevron-right" />
          </button>
        </div>

        <footer className="player__meta">
          <div className="player__info">
            {isWin && item.payout ? (
              <p className="player__amount">
                <span className="gold-text">{usd(item.payout)}</span>
                {item.bet ? <span className="player__mult">{multiplier(item.payout, item.bet)}</span> : null}
              </p>
            ) : null}
            <h2 className="player__title" id="player-title">
              {isWin ? `${item.game}${item.provider ? ` · ${item.provider}` : ''}` : item.title}
            </h2>
            {isWin && item.description ? <p className="player__desc">{item.description}</p> : null}
            <p className="player__byline">
              <span className="player__creator">{item.streamerName}</span>
              <span aria-hidden="true">·</span>
              <span>{dateLabel(item.publishedAt)}</span>
              {item.views ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{compact(item.views)} views</span>
                </>
              ) : null}
              {item.durationSec ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{clock(item.durationSec)}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="player__links">
            {shareNote ? (
              <span className="tag tag--success" role="status">
                <Icon name="check" />
                {shareNote}
              </span>
            ) : null}
            {item.url ? (
              <a className="btn btn--ghost btn--sm" href={item.url} target="_blank" rel="noopener noreferrer">
                <Icon name={PLATFORM_ICON[item.platform] ?? 'external'} />
                Open on {PLATFORM_LABEL[item.platform] === 'FGDR Original' ? 'source' : PLATFORM_LABEL[item.platform]}
              </a>
            ) : null}
          </div>
        </footer>
      </div>
    </dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Surface                                  */
/* -------------------------------------------------------------------------- */

function MediaSurface({ item }: { item: PlayableMedia }) {
  if (item.mediaUrl) return <VideoSurface item={item} />;

  if (item.embedUrl) {
    const src = item.platform === 'youtube' ? youtubeAutoplay(item.embedUrl) : item.embedUrl;
    return (
      <div className="player__frame">
        <iframe
          src={src}
          title={item.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
        />
      </div>
    );
  }

  // Platform does not allow in-site playback — hand off gracefully.
  return (
    <div className="player__handoff">
      <span className="player__handoff-icon">
        <Icon name={PLATFORM_ICON[item.platform] ?? 'external'} />
      </span>
      <p className="player__handoff-title">This clip plays on {PLATFORM_LABEL[item.platform]}</p>
      <p className="muted">{PLATFORM_LABEL[item.platform]} doesn&apos;t allow this clip to be played inside other sites.</p>
      {item.url ? (
        <a className="btn btn--gold" href={item.url} target="_blank" rel="noopener noreferrer">
          Watch on {PLATFORM_LABEL[item.platform]}
          <Icon name="external" />
        </a>
      ) : null}
    </div>
  );
}

function VideoSurface({ item }: { item: PlayableMedia }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = volume;
    // Autoplay with sound when the browser permits it (a click opened us);
    // otherwise fall back to muted playback rather than a dead frame.
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const toggleMute = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fullscreen = () => {
    const el = wrap.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => undefined);
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iOS Safari
  };

  const progress = length ? (time / length) * 100 : 0;

  return (
    <div
      ref={wrap}
      className={`vplayer ${playing ? 'is-playing' : ''} ${idle && playing ? 'is-idle' : ''}`}
      onMouseMove={wake}
      onTouchStart={wake}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'k') {
          e.preventDefault();
          toggle();
        }
        if (e.key === 'm') toggleMute();
        if (e.key === 'f') fullscreen();
      }}
    >
      <video
        ref={video}
        className="vplayer__video"
        src={item.mediaUrl ?? undefined}
        poster={item.thumbnailUrl ?? undefined}
        playsInline
        preload="auto"
        loop={item.kind === 'win'}
        onClick={toggle}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
      />

      {!playing ? (
        <button type="button" className="vplayer__big-play" onClick={toggle} aria-label="Play">
          <Icon name="play" />
        </button>
      ) : null}

      <div className="vplayer__controls">
        <button type="button" className="vplayer__btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>

        <span className="vplayer__time tabular">
          {clock(time)} / {clock(length)}
        </span>

        <input
          className="vplayer__scrub"
          type="range"
          min={0}
          max={length || 0}
          step={0.1}
          value={time}
          aria-label="Seek"
          style={{ ['--p' as string]: `${progress}%` }}
          onChange={(e) => {
            const v = video.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
        />

        <div className="vplayer__volume">
          <button type="button" className="vplayer__btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <Icon name={muted || volume === 0 ? 'mute' : 'volume'} />
          </button>
          <input
            className="vplayer__scrub vplayer__scrub--vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label="Volume"
            style={{ ['--p' as string]: `${(muted ? 0 : volume) * 100}%` }}
            onChange={(e) => {
              const v = video.current;
              if (!v) return;
              v.volume = Number(e.target.value);
              v.muted = v.volume === 0;
            }}
          />
        </div>

        <button type="button" className="vplayer__btn" onClick={fullscreen} aria-label="Fullscreen">
          <Icon name="expand" />
        </button>
      </div>
    </div>
  );
}
