'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/** A stable hue per slot, so one game's fallback always looks the same. */
function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * Slot art in portrait (3:4, the way casinos show it) that falls back to the
 * slot's initials when there is no image or it doesn't load. The art comes
 * from casino CDNs we don't control, and a broken-image icon is bad on the
 * site and worse on stream. (From MattySpins.)
 */
export function SlotArt({ src, name, width = 34, className }: { src: string | null; name: string; width?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const size = { width, height: Math.round((width * 4) / 3) };

  // A server-rendered image can fail before React is listening, and that
  // error event isn't replayed — so check on mount whether it already has.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className={`slot-thumb slot-thumb--ph ${className ?? ''}`}
        style={{ ...size, ['--hue' as string]: hueFor(name) } as CSSProperties}
        aria-hidden="true"
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img ref={ref} className={`slot-thumb ${className ?? ''}`} src={src} alt="" style={size} onError={() => setFailed(true)} />;
}
