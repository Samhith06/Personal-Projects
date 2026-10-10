import type { Metadata } from 'next';
import Link from 'next/link';
import { VipLadder } from '@/components/competition';
import { Icon } from '@/components/ui/Icon';
import { PageHero, ProgressBar } from '@/components/ui/primitives';
import { usd } from '@/lib/format';
import { getCurrentUser, getMemberProgress } from '@/server/auth/session';
import { getMilestones, getSiteSettings } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'VIP rewards',
  description:
    'Twelve FGDR VIP tiers, from $5,000 to $5,000,000 wagered in a month — every tier pays cash, and $100,000 unlocks your own VIP host.',
};

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  const [tiers, user, settings] = await Promise.all([getMilestones(), getCurrentUser(), getSiteSettings()]);
  const progress = user ? await getMemberProgress(user.id) : null;
  /** The ladder resets every calendar month, so this is the month's wager. */
  const wagered = progress?.monthWagered ?? null;

  const next = wagered !== null ? tiers.find((t) => t.threshold > wagered) : undefined;
  const unlocked = wagered !== null ? tiers.filter((t) => t.threshold <= wagered).length : 0;
  const prev = next ? [...tiers].reverse().find((t) => t.threshold <= (wagered ?? 0))?.threshold ?? 0 : 0;
  const hostTier = tiers.find((t) => t.perk);

  return (
    <>
      <PageHero
        eyebrow="Monthly wager · cash reward"
        title={
          <>
            VIP <span className="gold-text">rewards</span>
          </>
        }
        lede="Twelve tiers. Every one of them pays cash. The board resets on the first of each month — so does everybody's shot at the top."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          <div
            className="panel reveal"
            style={{ padding: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem)', marginBottom: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}
          >
            {user && wagered !== null ? (
              <div className="grid-2" style={{ alignItems: 'center' }}>
                <div>
                  <p className="kicker">Your wager this month</p>
                  <p className="dash-big gold-text tabular" style={{ marginTop: '0.5rem' }}>
                    {usd(wagered)}
                  </p>
                  <p className="dash-sub">
                    {unlocked} of {tiers.length} tiers unlocked
                  </p>
                </div>
                <div>
                  {next ? (
                    <>
                      <p style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span className="kicker">Next: {next.name}</span>
                        <span className="muted tabular">{usd(next.threshold - wagered)} to go</span>
                      </p>
                      <ProgressBar
                        value={wagered - prev}
                        max={next.threshold - prev}
                        label={`Progress to ${next.name}`}
                        tone="cyan"
                        size="lg"
                      />
                      <p className="dash-sub" style={{ marginTop: '0.75rem' }}>
                        Unlocks: {next.cashReward > 0 ? `${usd(next.cashReward)} cash` : next.reward}
                        {next.perk ? ` · ${next.perk}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="lede">Every tier cleared this month. Immortal status.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div>
                  <p className="kicker">Track your progress</p>
                  <p className="lede" style={{ marginTop: '0.4rem' }}>
                    Sign in and link your accounts to see exactly how close you are to the next cash reward.
                  </p>
                </div>
                <Link className="btn btn--discord btn--lg" href="/login?returnTo=/rewards">
                  <Icon name="discord" />
                  Login with Discord
                </Link>
              </div>
            )}
          </div>

          <div className="reveal">
            <VipLadder tiers={tiers} wagered={wagered} />
          </div>

          {hostTier ? (
            <aside className="vip-host reveal">
              <p className="vip-host__kicker">Hit {usd(hostTier.threshold)} wagered</p>
              <p className="vip-host__title">{hostTier.perk}</p>
              <a
                className="btn btn--discord btn--lg"
                href={settings.discordUrl === '#' ? '/community' : settings.discordUrl}
                target={settings.discordUrl === '#' ? undefined : '_blank'}
                rel={settings.discordUrl === '#' ? undefined : 'noopener noreferrer'}
              >
                <Icon name="discord" />
                Join the FGDR Discord
              </a>
            </aside>
          ) : null}

          <p className="fineprint">
            Tiers count verified wagers made with the FGDR affiliate within a single calendar month, after your accounts are
            linked. Rewards are issued after verification and are subject to the program rules. Wagering more to reach a tier
            is never required — please gamble responsibly.
          </p>
        </div>
      </section>
    </>
  );
}
