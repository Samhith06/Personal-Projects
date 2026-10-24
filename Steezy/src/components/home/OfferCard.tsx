import { currentLeaderboard } from '@/server/services/leaderboards';
import { env } from '@/lib/env';
import { formatUsd } from '@/lib/format';
import { CopyCode } from './CopyCode';

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.18" />
    <path d="M7 12.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Roobet partner offer, as one compact card: brand · code + perks · call to action.
 * Sits over the chip animation on the home page (frosted glass).
 */
export async function OfferCard() {
  const board = await currentLeaderboard().catch(() => null);
  const pool = board ? board.prizes.reduce((a, b) => a + b, 0) : null;

  return (
    <article className="offer" aria-labelledby="offer-title">
      <div className="offer__brand">
        <span className="offer__badge">Official partner</span>
        <img src="/brand/roobet-logo-gold.png" alt="Roobet" width={163} height={50} className="offer__logo" />
        <span className="offer__meta">Exclusive SteezeSpins offer</span>
      </div>

      <div className="offer__main">
        <span className="kicker" id="offer-title">
          Sign up with code
        </span>
        <CopyCode code="STZY" />
        <ul className="offer__perks">
          {pool ? (
            <li>
              <Check />
              {formatUsd(pool)} monthly wager leaderboard
            </li>
          ) : null}
          <li>
            <Check />
            <span>
              <b>20% monthly loss back</b>
            </span>
          </li>
          <li>
            <Check />
            Milestone rewards &amp; raffle tickets on every wager
          </li>
          <li>
            <Check />
            <a href={env.discordInviteUrl} target="_blank" rel="noopener">
              <b>VIP transfers</b> — bring your status from another casino
            </a>
          </li>
        </ul>
      </div>

      <div className="offer__cta">
        <div className="offer__tiles">
          <div>
            <span>Loss back</span>
            <b>20%</b>
          </div>
          <div>
            <span>Leaderboard</span>
            <b>{pool ? formatUsd(pool) : 'Monthly'}</b>
          </div>
        </div>
        <a className="btn btn--primary offer__play" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
          Play on Roobet →
        </a>
        <ol className="offer__steps" aria-label="How it works">
          <li>Sign up via the link</li>
          <li>Play as normal</li>
          <li>Get rewarded</li>
        </ol>
        <span className="offer__legal">18+ only · Gamble responsibly</span>
      </div>
    </article>
  );
}
