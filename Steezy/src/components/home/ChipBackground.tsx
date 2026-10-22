'use client';

import { useEffect, useRef } from 'react';

/**
 * The hero's animated casino-chip background (three.js, ~600 KB) — loaded only
 * in the browser, after the page is up. The hero's CSS gradient underneath is
 * the poster: it shows until the first frame and stays if WebGL is missing.
 *
 *   - Pauses when the hero scrolls out of view or the tab is hidden.
 *   - prefers-reduced-motion: one still frame, no animation.
 *   - Phones get fewer chips and a lower pixel ratio.
 */
export function ChipBackground() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

      const { createChipScene } = await import('./chip-scene');
      if (disposed) return;

      await document.fonts.ready.catch(() => undefined);
      const narrow = window.matchMedia('(max-width: 760px)').matches;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scene = await createChipScene(el, {
        fontFamily: getComputedStyle(document.body).fontFamily,
        density: narrow ? 0.6 : 1,
        maxPixelRatio: narrow ? 1 : 1.5,
      });
      if (disposed) {
        scene.dispose();
        return;
      }
      el.dataset.ready = 'true';

      if (reduced) {
        scene.renderStill();
        cleanup = () => scene.dispose();
        return;
      }

      let visible = true;
      const sync = () => (visible && !document.hidden ? scene.start() : scene.stop());
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
      io.observe(el);
      document.addEventListener('visibilitychange', sync);
      sync();

      cleanup = () => {
        io.disconnect();
        document.removeEventListener('visibilitychange', sync);
        scene.dispose();
      };
    })().catch((error) => console.warn('[chips] background unavailable', error));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} className="hero__chips" aria-hidden="true" />;
}
