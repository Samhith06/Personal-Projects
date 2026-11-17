import { AboutSection } from '@/components/home/AboutSection';
import { ChipBackground } from '@/components/home/ChipBackground';
import { HomePodium } from '@/components/home/HomePodium';
import { OfferCard } from '@/components/home/OfferCard';
import { PayoutTracker } from '@/components/home/PayoutTracker';
import { env } from '@/lib/env';
import { LoginButton } from '@/components/LoginButton';
import { DoublePointsBanner } from '@/components/leaderboard/DoublePointsBanner';
import { currentLeaderboard } from '@/server/services/leaderboards';
import { currentBoost } from '@/server/services/wager-boosts';
import { getCurrentUser } from '@/server/auth/session';

/**
 * Home. One casino-chip WebGL scene (ARCHITECTURE.md §5.3) runs behind both the
 * hero and the Roobet partner panel, over a static gradient that doubles as its
 * poster. Below it: total paid out, this month's top 3 and the About section. Biggest wins (Kick
 * clips) comes with the clips work.
 */
export default async function HomePage() {
  const [user, boost, board] = await Promise.all([
    getCurrentUser().catch(() => null),
    currentBoost().catch(() => null),
    currentLeaderboard().catch(() => null),
  ]);
  return (
    <>
      <div className="home-stage">
        <ChipBackground />
        <div className="home-stage__scrim" aria-hidden="true" />

        <section className="hero">
          <div className="container hero__content">
            {boost && board?.status === 'live' ? <DoublePointsBanner boost={boost} /> : null}
            <h1 className="hero__title">Every spin, counted together.</h1>
            <p className="hero__lede">
              The SteezySpins community hub — leaderboards, giveaways, bonus hunts and slot tournaments, tied to your Discord
              account.
            </p>
            <div className="row">
              {user ? (
                <a className="btn btn--primary" href="/me">
                  My profile
                </a>
              ) : (
                <LoginButton />
              )}
              <a className="btn btn--secondary" href={env.discordInviteUrl} target="_blank" rel="noopener">
                Join the Discord
              </a>
            </div>
          </div>
        </section>

        <section className="partner" id="partner">
          <div className="container">
            <OfferCard />
          </div>
        </section>
      </div>
      <PayoutTracker />
      <HomePodium />
      <AboutSection />
    </>
  );
}
