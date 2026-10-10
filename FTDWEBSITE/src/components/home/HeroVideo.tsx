'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic background video, loaded politely:
 *  - poster paints immediately (and is all reduced-motion / Save-Data users get)
 *  - the right rendition is chosen for the viewport before any bytes load
 *  - playback starts after the page is idle, and pauses when off-screen
 *  - if an optimised rendition fails, the original source is used instead
 */
export function HeroVideo({
  src,
  mobileSrc,
  desktopSrc,
  poster,
  mobilePoster,
}: {
  /** The configured source (admin-managed). */
  src: string;
  /** Optimised renditions of the same footage. */
  mobileSrc?: string;
  desktopSrc?: string;
  poster: string;
  mobilePoster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (reduce || conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return;

    const small = window.matchMedia('(max-width: 767px)').matches;
    const chosen = (small ? mobileSrc : desktopSrc) ?? src;

    const start = () => setActive(chosen);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1200 });
    else setTimeout(start, 300);
  }, [src, mobileSrc, desktopSrc]);

  // Pause when the hero scrolls out of view; resume when it returns.
  useEffect(() => {
    const video = ref.current;
    if (!video || !active) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [active]);

  return (
    <div className={`hero__media ${ready ? 'is-ready' : ''}`} aria-hidden="true">
      <picture>
        {mobilePoster ? <source media="(max-width: 767px)" srcSet={mobilePoster} /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero__poster" src={poster} alt="" fetchPriority="high" decoding="async" />
      </picture>
      {active ? (
        <video
          ref={ref}
          className="hero__video"
          src={active}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onCanPlay={() => {
            setReady(true);
            ref.current?.play().catch(() => undefined);
          }}
          onError={() => {
            if (active !== src) setActive(src);
          }}
        />
      ) : null}
      <div className="hero__overlay" />
      <div className="hero__rays" />
      <div className="hero__vignette" />
    </div>
  );
}
