import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/ui/primitives';

/**
 * Legal copy. These are sensible starting drafts written for a creator
 * affiliate site — they must be reviewed by counsel for the jurisdictions
 * FGDR operates in before launch.
 */
const PAGES: Record<string, { title: string; lede: string; body: ReactNode }> = {
  'responsible-gambling': {
    title: 'Responsible gambling',
    lede: 'Gambling should be entertainment — never a way to make money or solve problems.',
    body: (
      <>
        <p>
          FGDR streams and clips show real gambling. The results you see — especially on the Wall of Fame — are rare. They are
          not typical, they are not a strategy, and they are not a promise of what will happen to you. Most gambling sessions
          lose money. There is no system that beats the house edge.
        </p>
        <h2>Keep it fun</h2>
        <ul>
          <li>Only gamble with money you can afford to lose.</li>
          <li>Set a deposit and time limit before you start, and stick to it.</li>
          <li>Never chase losses or gamble to win back money.</li>
          <li>Don&apos;t gamble when you&apos;re stressed, upset or under the influence.</li>
          <li>Take regular breaks, and balance gambling with other activities.</li>
          <li>Never borrow money or use money meant for bills to gamble.</li>
        </ul>
        <h2>Warning signs</h2>
        <p>
          Spending more than you planned, hiding gambling from people close to you, feeling anxious when you aren&apos;t gambling,
          or needing to bet more to feel the same excitement are all signs to stop and talk to someone.
        </p>
        <h2>Tools and support</h2>
        <ul>
          <li>Use the deposit limits, loss limits, cool-off and self-exclusion tools offered by your casino account.</li>
          <li>
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
              BeGambleAware
            </a>{' '}
            — free, confidential advice and support.
          </li>
          <li>
            US: call <a href="tel:18004262537">1-800-GAMBLER</a> or visit{' '}
            <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer">
              NCPG
            </a>
            .
          </li>
          <li>
            <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer">
              Gambling Therapy
            </a>{' '}
            — international support in multiple languages.
          </li>
        </ul>
        <h2>Age and location</h2>
        <p>
          You must be 18 or older (or the legal gambling age where you live, if higher). Online gambling is restricted or
          prohibited in some countries and states. It is your responsibility to know and follow the laws that apply to you.
          FGDR content is not intended for anyone under the legal age.
        </p>
      </>
    ),
  },
  terms: {
    title: 'Terms of use',
    lede: 'The rules for using the FGDR website and community features.',
    body: (
      <>
        <p>
          By using this website you agree to these terms. FGDR is a group of independent content creators. We do not operate
          a casino, accept wagers, hold funds or process payments.
        </p>
        <h2>Eligibility</h2>
        <p>You must be at least 18 years old, and of legal gambling age in your jurisdiction, to take part in community features.</p>
        <h2>Accounts</h2>
        <p>
          Accounts are created by signing in with Discord. You are responsible for activity on your account. Linked Kick and
          Stake usernames must belong to you; misrepresenting an account may disqualify you from raffles, challenges and
          leaderboard prizes.
        </p>
        <h2>Prizes</h2>
        <p>
          Raffles, challenges, milestones and leaderboard prizes are governed by their own published rules, can be verified
          before payout, and may be changed or withdrawn where required by law. Prizes are void where prohibited.
        </p>
        <h2>Conduct</h2>
        <p>Harassment, fraud, multi-accounting and attempts to manipulate standings will result in removal from the community.</p>
        <h2>No advice</h2>
        <p>Nothing on this site is financial advice or a recommendation to gamble. Content is for entertainment only.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy policy',
    lede: 'What we collect, why, and what we never collect.',
    body: (
      <>
        <h2>What we store</h2>
        <ul>
          <li>From Discord: your user ID, username, display name and avatar. We request the “identify” scope only.</li>
          <li>From Kick (if you link it): your Kick user ID and username, and whether the link was verified.</li>
          <li>Your Stake username, only if you choose to add it. It is never shown publicly.</li>
          <li>Your raffle entries, challenge participation and verified wager progress.</li>
        </ul>
        <h2>What we never store</h2>
        <ul>
          <li>Passwords — there are none; sign-in happens through Discord.</li>
          <li>Discord or Kick access tokens — they are used once during sign-in and discarded.</li>
          <li>Your email address, Discord servers, messages or payment details.</li>
        </ul>
        <h2>Cookies</h2>
        <p>
          We use a single signed, httpOnly session cookie to keep you signed in, plus short-lived cookies that protect the
          sign-in process. Stream reminders you set are stored only in your browser.
        </p>
        <h2>Your choices</h2>
        <p>You can unlink Kick or remove your Stake username at any time from your account page, or ask us to delete your account.</p>
      </>
    ),
  },
  'raffle-rules': {
    title: 'Raffle & giveaway rules',
    lede: 'How FGDR draws work.',
    body: (
      <>
        <ul>
          <li>Open to members aged 18+ (or the legal age in their jurisdiction) where participation is lawful. Void where prohibited.</li>
          <li>No purchase or wager is necessary to enter where required by law. A free alternative method of entry is available on request.</li>
          <li>One entry per member per raffle unless the raffle states otherwise. Entries are tied to a linked Kick account.</li>
          <li>Eligibility requirements are listed on each raffle and verified before the draw.</li>
          <li>Winners are drawn at random, live on stream, and contacted through Discord. Unclaimed prizes may be redrawn after 14 days.</li>
          <li>Winners may be responsible for any taxes that apply to prizes.</li>
        </ul>
      </>
    ),
  },
  'affiliate-disclosure': {
    title: 'Affiliate disclosure',
    lede: 'How FGDR is supported.',
    body: (
      <>
        <p>
          FGDR creators are affiliated with Stake and may receive commission when viewers sign up or play through FGDR
          affiliate links or codes. That relationship funds community prizes and content.
        </p>
        <p>
          Being affiliated does not change the odds of any game, and it never means gambling is a good way to make money.
          Play only if gambling is legal where you live, and only with money you can afford to lose.
        </p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/legal/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug];
  return page ? { title: page.title, description: page.lede } : { title: 'Not found' };
}

export default async function LegalPage({ params, searchParams }: PageProps<'/legal/[slug]'>) {
  const { slug } = await params;
  const underage = (await searchParams).underage === '1';
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <>
      <PageHero eyebrow="FGDR" title={page.title} lede={page.lede} />
      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          {underage ? (
            <p className="notice notice--gold prose" role="status" style={{ marginBottom: '2rem' }}>
              You&apos;ve been signed out. FGDR community features are only for people aged 18 or older. Thanks for being honest.
            </p>
          ) : null}
          <div className="prose">{page.body}</div>
        </div>
      </section>
    </>
  );
}
