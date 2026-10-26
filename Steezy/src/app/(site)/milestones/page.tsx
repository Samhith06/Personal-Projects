import type { Metadata } from 'next';
import Link from 'next/link';
import { claimMilestoneAction } from '@/server/actions/milestones';
import { getCurrentUser } from '@/server/auth/session';
import { milestoneView } from '@/server/services/milestones';
import { formatUsd } from '@/lib/format';
import { loginHref, loginLabel } from '@/lib/env';

export const metadata: Metadata = { title: 'Milestones' };

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  claimed: { text: 'Claimed! Steezy’s team will tip it to your Roobet account.', ok: true },
  not_linked: { text: 'Link and get your Roobet username approved first.', ok: false },
  blocked: { text: 'Your account can’t claim rewards right now. Ask an admin in Discord.', ok: false },
  not_reached: { text: 'You haven’t reached that tier yet.', ok: false },
  already_claimed: { text: 'You’ve already claimed that tier.', ok: false },
  unknown: { text: 'That milestone doesn’t exist any more.', ok: false },
};

export default async function MilestonesPage({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams;
  const user = await getCurrentUser();
  const view = await milestoneView(user?.id ?? null);
  const message = claim ? MESSAGES[claim] : null;

  const next = view.tiers.find((t) => !t.reached);
  const prevThreshold = [...view.tiers].reverse().find((t) => t.reached)?.threshold ?? 0;
  const pct =
    next && view.lifetime !== null
      ? Math.min(100, Math.max(0, ((view.lifetime - prevThreshold) / (next.threshold - prevThreshold)) * 100))
      : 100;
  const reachedCount = view.tiers.filter((t) => t.reached).length;
  // Share of the rail to light up, 0–1: from the first node to the last reached one.
  const rail = view.tiers.length > 1 ? Math.max(0, (reachedCount - 1) / (view.tiers.length - 1)) : 0;

  return (
    <div className="container page">
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Milestones</span>
        <h1 className="page__title">Lifetime wager rewards</h1>
        <p className="meta" style={{ maxWidth: '56ch' }}>
          Everything you wager on Roobet under code STZY adds up, counted as Roobet’s weighted wager (low-edge games count for less). Each tier pays out once, tipped to your Roobet account.
        </p>
      </div>

      {message ? <p className={`notice ${message.ok ? 'notice--ok' : 'notice--danger'}`}>{message.text}</p> : null}

      <div className="ms-layout">
        <aside className="card stack ms-summary">
          {!user ? (
            <>
              <p>Log in to track your progress and claim rewards.</p>
              <a className="btn btn--primary" href={loginHref('/milestones')}>
                {loginLabel()}
              </a>
            </>
          ) : !view.linked ? (
            <>
              <p>Link your Roobet username to start counting.</p>
              <Link className="btn btn--primary" href="/me/link">
                Link Roobet
              </Link>
            </>
          ) : (
            <>
              <div>
                <div className="meta">Your lifetime weighted wager</div>
                <div className="num" style={{ fontSize: 40, letterSpacing: '-0.03em' }}>
                  {formatUsd(view.lifetime ?? 0)}
                </div>
              </div>
              {next ? (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                    <span className="meta">
                      Next: <span style={{ color: 'var(--color-text)' }}>{next.name}</span>
                    </span>
                    <span className="meta num">{formatUsd(next.threshold - (view.lifetime ?? 0))} to go</span>
                  </div>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="meta">Every tier reached.</p>
              )}
            </>
          )}
          <span className="meta">Roobet affiliate data · code STZY</span>
        </aside>

        <ol className="ms-rail" style={{ ['--rail' as string]: rail }}>
          {view.tiers.map((t) => (
            <li key={t.id} className={`ms-tier${t.reached ? ' is-reached' : ''}`}>
              <span className="ms-tier__node" aria-hidden="true">
                {t.reached ? '✓' : ''}
              </span>
              <div className="ms-tier__body">
                <div className="ms-tier__name">{t.name}</div>
                <div className="meta num">{formatUsd(t.threshold)} weighted wager</div>
              </div>
              <span className="num ms-tier__reward">{formatUsd(t.reward)}</span>
              <div className="ms-tier__action">
                {t.claimable ? (
                  <form action={claimMilestoneAction}>
                    <input type="hidden" name="milestoneId" value={t.id} />
                    <button className="btn btn--primary" type="submit">
                      Claim
                    </button>
                  </form>
                ) : t.claim ? (
                  <span className={t.claim.status === 'paid' ? 'tag tag--accent' : 'tag tag--warn'}>
                    {t.claim.status === 'paid' ? 'Paid' : 'Claimed · paying soon'}
                  </span>
                ) : t.reached ? (
                  <span className="meta">Reached</span>
                ) : (
                  <span className="meta">Locked</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
