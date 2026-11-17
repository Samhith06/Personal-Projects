'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return d ? `${d}d ${hms}` : hms;
}

/**
 * Ticking "01:23:45" to `to`. Starts from the server's time so the first paint
 * matches, and re-renders the page from the server when it hits zero, so the
 * banner flips from "starts in" to "live" to gone on its own.
 */
export function BoostCountdown({ to, serverNow }: { to: string; serverNow: string }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  const refreshed = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (now >= target && !refreshed.current) {
      refreshed.current = true;
      // Small delay so the server sees the boundary too.
      setTimeout(() => router.refresh(), 1500);
    }
  }, [now, target, router]);

  return (
    <span className="num" role="timer">
      {clock(target - now)}
    </span>
  );
}

/** A time in the viewer's own time zone, e.g. "Tue 8:00 PM". */
export function LocalTime({ at }: { at: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(new Date(at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }));
  }, [at]);
  return <time dateTime={at}>{text ?? new Date(at).toUTCString().slice(0, 22) + ' UTC'}</time>;
}
