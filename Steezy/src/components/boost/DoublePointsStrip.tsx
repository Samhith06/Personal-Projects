'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BoostCountdown } from './BoostClock';

/** Pages that show the full banner instead. */
const HAS_BANNER = new Set(['/', '/leaderboard']);

/**
 * Thin strip above the header on every page while double points is on or
 * about to start, so people see it without opening the leaderboard.
 */
export function DoublePointsStrip({
  multiplier,
  live,
  countdownTo,
  serverNow,
}: {
  multiplier: number;
  live: boolean;
  /** Start (upcoming) or end (live); null = live with no timer. */
  countdownTo: string | null;
  serverNow: string;
}) {
  const path = usePathname();
  if (HAS_BANNER.has(path)) return null;
  const label = multiplier === 2 ? 'Double points' : `${multiplier}× points`;

  return (
    <Link href="/leaderboard" className={`boost-strip${live ? ' is-live' : ''}`}>
      <span className="boost-strip__badge">{multiplier}×</span>
      {live ? (
        <span>
          <b>{label} live</b>
          <span className="boost-strip__more"> · every wager under code STZY counts {multiplier}×</span>
          {countdownTo ? (
            <>
              {' '}
              · ends in <BoostCountdown to={countdownTo} serverNow={serverNow} />
            </>
          ) : null}
        </span>
      ) : (
        <span>
          <b>{label}</b> starts in {countdownTo ? <BoostCountdown to={countdownTo} serverNow={serverNow} /> : null}
          <span className="boost-strip__more"> · every wager under code STZY will count {multiplier}×</span>
        </span>
      )}
      <span className="boost-strip__cta">Leaderboard →</span>
    </Link>
  );
}
