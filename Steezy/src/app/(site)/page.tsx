import { AboutSection } from '@/components/home/AboutSection';
import { ChipBackground } from '@/components/home/ChipBackground';
import { HomePodium } from '@/components/home/HomePodium';
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

        <section className="partner" id="partner" aria-labelledby="partner-title">
          <div className="container">
            <div className="partner__panel">
              <div className="stack" style={{ gap: 14 }}>
                <span className="partner__eyebrow" id="partner-title">
                  Official partner
                  <img src="/brand/roobet-logo-gold.png" alt="Roobet" width={109} height={34} />
                </span>
                <span style={{ color: 'var(--color-accent-200)' }}>Sign up with code</span>
                <span className="partner__code">STZY</span>
              </div>
              <div className="stack" style={{ gap: 24 }}>
                <ol className="partner__steps">
                  <li>
                    <strong>Sign up through the link</strong>
                    Opens Roobet with STZY already applied.
                  </li>
                  <li>
                    <strong>Play as you normally would</strong>
                    Every wager under the code is tracked automatically.
                  </li>
                  <li>
                    <strong>Get rewarded</strong>
                    Climb the monthly leaderboard, unlock milestones and earn raffle tickets.
                  </li>
                </ol>
                <div className="row" style={{ gap: 16 }}>
                  <a className="btn btn--primary" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
                    Open Roobet
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--color-accent-300)' }}>18+ only. Gamble responsibly.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <HomePodium />
      <AboutSection />
    </>
  );
}
