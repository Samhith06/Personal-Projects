'use client';

import { useEffect, useState } from 'react';

const DAY = 86_400_000;

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hrs: Math.floor((s % 86400) / 3600), min: Math.floor((s % 3600) / 60), sec: s % 60 };
}

/**
 * Ticking "race ends in" tiles plus "Day X of Y" with a progress bar.
 * Server-rendered with the server's time, then ticks every second in the browser.
 */
export function RaceCountdown({ startsAt, endsAt, serverNow }: { startsAt: string; endsAt: string; serverNow: string }) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const p = parts(end - now);
  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const day = Math.min(totalDays, Math.max(1, Math.floor((now - start) / DAY) + 1));
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const ended = end <= now;

  return (
    <div className="race-timer">
      <div className="race-timer__head">
        <span>{ended ? 'Race ended' : 'Race ends in'}</span>
        <span>
          Day {day} of {totalDays}
        </span>
      </div>
      <div className="race-timer__tiles" role="timer" aria-label={`${p.days} days ${p.hrs} hours ${p.min} minutes left`}>
        {(
          [
            ['days', p.days],
            ['hrs', p.hrs],
            ['min', p.min],
            ['sec', p.sec],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="race-timer__tile">
            <b className="num">{String(v).padStart(2, '0')}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="race-timer__bar" aria-hidden="true">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
