import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & responsible gambling' };

/** Placeholder wording from the design canvas — to be reviewed by a lawyer before launch. */
export default async function TermsPage({ searchParams }: { searchParams: Promise<{ underage?: string }> }) {
  const { underage } = await searchParams;
  return (
    <div className="container page">
      {underage ? <p className="notice notice--danger">This site is 18+ only. You&apos;ve been signed out.</p> : null}
      <article className="prose">
        <span className="kicker">Terms of Service</span>
        <h1 className="page__title" style={{ margin: '10px 0 8px' }}>
          The rules, in plain words
        </h1>
        <p className="meta">Version [1.0] · effective [DATE]</p>
        <p className="notice notice--ok" style={{ marginTop: 20 }}>
          SteezeSpins is a fan community site. It doesn&apos;t take bets or hold money. Wagering happens on Roobet, under
          Roobet&apos;s own terms.
        </p>

        <h2>1. Who can use the site</h2>
        <ul>
          <li>You must be 18+ and of legal gambling age where you live.</li>
          <li>One account per person. Alt accounts are removed and lose any rewards.</li>
        </ul>

        <h2>2. Leaderboards, milestones and prizes</h2>
        <ul>
          <li>Wager totals come from Roobet affiliate data under code STZY.</li>
          <li>Prizes and milestone rewards are paid as Roobet tips to your approved username.</li>
          <li>Abuse (self-referral, collusion, bonus abuse) disqualifies. Admin decisions are final.</li>
        </ul>

        <h2>3. Giveaways and raffles</h2>
        <ul>
          <li>No purchase needed. Entry rules are shown on each giveaway.</li>
          <li>Draws are provably fair: the seed fingerprint is published before the draw and the seed after it.</li>
        </ul>

        <h2 id="privacy">4. Privacy</h2>
        <p>
          We store your Discord ID and name, linked Kick and Roobet usernames, Kick chat activity during streams (to calculate
          watch time), and hashed IP data (to stop alt accounts). Ask in Discord to export or delete your data.
        </p>

        <h2 id="responsible-gambling">5. Responsible gambling</h2>
        <p>
          Gambling is entertainment, not a way to make money. Set limits before you play and never chase losses. Roobet offers
          deposit limits and self-exclusion in its settings.
        </p>
        <ul>
          <li>
            <a href="https://www.begambleaware.org">BeGambleAware</a> (UK)
          </li>
          <li>
            <a href="https://www.gamcare.org.uk">GamCare</a> · 0808 8020 133 (UK)
          </li>
          <li>
            <a href="https://www.ncpgambling.org">1-800-GAMBLER</a> (US)
          </li>
          <li>
            <a href="https://www.gamblersanonymous.org">Gamblers Anonymous</a> (worldwide)
          </li>
        </ul>
      </article>
    </div>
  );
}
