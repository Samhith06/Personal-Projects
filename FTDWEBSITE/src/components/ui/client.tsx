'use client';

import { useEffect, useRef, useState } from 'react';
import { formatValue } from '@/lib/format';

/* -------------------------------------------------------------------- Reveal
 * One observer for the whole page. Adds `.is-in` to `.reveal` elements (and to
 * progress bars so they fill as they scroll into view), and starts counters.
 * Re-scans on route change via a MutationObserver.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal, [data-animate]').forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );

    const scan = () =>
      document.querySelectorAll('.reveal:not(.is-in), [data-animate]:not(.is-in)').forEach((el) => io.observe(el));

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}

/* ----------------------------------------------------------------- Countdown */

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    diff,
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Countdown({
  target,
  label,
  compact = false,
  endedLabel = 'Ended',
}: {
  target: string;
  label: string;
  compact?: boolean;
  endedLabel?: string;
}) {
  const ms = new Date(target).getTime();
  // Render nothing time-dependent until mounted to avoid hydration drift.
  const [now, setNow] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    setNow(parts(ms));
    const t = setInterval(() => setNow(parts(ms)), 1000);
    return () => clearInterval(t);
  }, [ms]);

  if (compact) {
    let text = '—';
    if (now) {
      if (now.diff === 0) text = endedLabel;
      else if (now.d > 0) text = `${now.d}d ${now.h}h ${pad(now.m)}m`;
      else text = `${now.h}h ${pad(now.m)}m ${pad(now.s)}s`;
    }
    return (
      <span className="countdown--compact" aria-label={label}>
        {text}
      </span>
    );
  }

  const units: [string, number | undefined][] = [
    ['Days', now?.d],
    ['Hrs', now?.h],
    ['Min', now?.m],
    ['Sec', now?.s],
  ];

  return (
    <div className={`countdown ${now && now.diff > 0 && now.diff < 86_400_000 ? 'is-urgent' : ''}`} role="timer" aria-label={label}>
      {units.map(([unit, value]) => (
        <span className="countdown__unit" key={unit}>
          <span className="countdown__value">{value === undefined ? '--' : pad(value)}</span>
          <span className="countdown__label">{unit}</span>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Counter */

export function Counter({ value, format = 'number' }: { value: number; format?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(formatValue(value, format));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1600;
        const step = (t: number) => {
          const k = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - k, 3);
          setDisplay(formatValue(Math.round(value * eased), format));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        setDisplay(formatValue(0, format));
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, format]);

  return (
    <span ref={ref} className="tabular">
      {display}
    </span>
  );
}

/* --------------------------------------------------------------- Local time */

/** Renders a timestamp in the visitor's own timezone after hydration. */
export function LocalTime({
  value,
  options,
  fallback,
}: {
  value: string;
  options: Intl.DateTimeFormatOptions;
  fallback: string;
}) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    setText(new Date(value).toLocaleString('en-US', options));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <time dateTime={value} suppressHydrationWarning>
      {text}
    </time>
  );
}

export function RelativeTime({ value, fallback }: { value: string; fallback: string }) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(value).getTime();
      const past = diff >= 0;
      const minutes = Math.round(Math.abs(diff) / 60_000);
      let out: string;
      if (minutes < 1) return setText('just now');
      if (minutes < 60) out = `${minutes}m`;
      else if (minutes < 1440) out = `${Math.round(minutes / 60)}h`;
      else out = `${Math.round(minutes / 1440)}d`;
      setText(past ? `${out} ago` : `in ${out}`);
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [value]);
  return <time dateTime={value}>{text}</time>;
}
