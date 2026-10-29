import { payoutTotals } from '@/server/services/payout-tracker';
import { dateShort, formatUsd } from '@/lib/format';

/**
 * "Total paid out to date": lifetime payouts in one big glowing figure, with
 * the split underneath. Counts what staff marked paid plus the admin-entered
 * amount from before the site (src/server/services/payout-tracker.ts).
 */
export async function PayoutTracker() {
  const t = await payoutTotals().catch(() => null);
  if (!t) return null;
  const parts = [
    { label: 'Leaderboards', value: t.leaderboards },
    { label: 'Giveaways & raffles', value: t.giveawaysAndRaffles },
    { label: 'Tips & rewards', value: t.tips },
    ...(t.earlier > 0 ? [{ label: 'Earlier payouts', value: t.earlier }] : []),
  ];

  return (
    <section className="container home-section payout-tracker" aria-labelledby="payout-tracker-title">
      <span className="payout-tracker__pill">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M17 6h2a2 2 0 0 1 0 4h-2M7 6H5a2 2 0 0 0 0 4h2" />
        </svg>
        Payout tracker
      </span>
      <h2 id="payout-tracker-title" className="payout-tracker__title">
        Total <span>paid out</span> to date
      </h2>
      <p className="payout-tracker__lede">
        Combined leaderboard payouts plus giveaway prizes and tips paid to SteezySpins viewers
        {t.since ? ` since ${dateShort(t.since)}` : ''}.
      </p>

      <div className="payout-tracker__card">
        <span className="payout-tracker__label">Lifetime payouts</span>
        <span className="num payout-tracker__total">{formatUsd(t.total)}</span>
        <dl className="payout-tracker__parts">
          {parts.map((p) => (
            <div key={p.label}>
              <dt>{p.label}</dt>
              <dd className="num">{formatUsd(p.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
