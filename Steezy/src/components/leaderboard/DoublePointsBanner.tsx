import { BoostCountdown } from '@/components/boost/BoostClock';
import { env } from '@/lib/env';
import { boostEnd, boostLabel, boostState, type WagerBoost } from '@/server/services/wager-boosts';

/**
 * The strip at the top of /leaderboard while double points is on (or about to
 * start). The countdown refreshes the page when it hits zero, so it flips from
 * "starts in" to "live" to gone without a reload.
 */
export function DoublePointsBanner({ boost }: { boost: WagerBoost }) {
  const now = new Date();
  const state = boostState(boost, now);
  if (state === 'ended') return null;
  const end = boostEnd(boost);
  const label = boostLabel(boost.multiplier);
  const serverNow = now.toISOString();

  if (state === 'upcoming') {
    return (
      <aside className="boost-banner is-upcoming" aria-label={label}>
        <span className="boost-banner__badge">{boost.multiplier}×</span>
        <div className="boost-banner__text">
          <strong>{label} is coming</strong>
          <span>Every wager under code STZY will count {boost.multiplier}× on the leaderboard.</span>
        </div>
        <div className="boost-banner__clock">
          <span>Starts in</span>
          <BoostCountdown to={boost.startsAt.toISOString()} serverNow={serverNow} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="boost-banner" aria-label={label}>
      <span className="boost-banner__badge">{boost.multiplier}×</span>
      <div className="boost-banner__text">
        <strong>
          <span className="dot dot--live" /> {label} on wagers — start wagering now!
        </strong>
        <span>Every bet under code STZY counts {boost.multiplier}× on the leaderboard{end ? ' until the timer runs out' : ' for a limited time'}.</span>
      </div>
      {end ? (
        <div className="boost-banner__clock">
          <span>Ends in</span>
          <BoostCountdown to={end.toISOString()} serverNow={serverNow} />
        </div>
      ) : null}
      <a className="btn btn--primary boost-banner__cta" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
        Play now →
      </a>
    </aside>
  );
}
