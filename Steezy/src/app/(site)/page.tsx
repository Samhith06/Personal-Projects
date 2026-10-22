import { AboutSection } from '@/components/home/AboutSection';
import { ChipBackground } from '@/components/home/ChipBackground';
import { HomePodium } from '@/components/home/HomePodium';
import { OfferCard } from '@/components/home/OfferCard';
import { env } from '@/lib/env';
import { getCurrentUser } from '@/server/auth/session';

/**
 * Home. One casino-chip WebGL scene (ARCHITECTURE.md §5.3) runs behind both the
 * hero and the Roobet partner panel, over a static gradient that doubles as its
 * poster. Below it: this month's top 3 and the About section. Biggest wins (Kick
 * clips) comes with the clips work.
 */
export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <>
      <div className="home-stage">
        <ChipBackground />
        <div className="home-stage__scrim" aria-hidden="true" />

        <section className="hero">
          <div className="container hero__content">
            <h1 className="hero__title">Every spin, counted together.</h1>
            <p className="hero__lede">
              The SteezeSpins community hub — leaderboards, giveaways, bonus hunts and slot tournaments, tied to your Discord
              account.
            </p>
            <div className="row">
              {user ? (
                <a className="btn btn--primary" href="/me">
                  My profile
                </a>
              ) : (
                <a className="btn btn--primary" href="/api/auth/discord">
                  Log in with Discord
                </a>
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
      <HomePodium />
      <AboutSection />
    </>
  );
}
