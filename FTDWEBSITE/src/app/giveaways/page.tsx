import type { Metadata } from 'next';
import Link from 'next/link';
import { GiveawayTotal, WinnerSlider } from '@/components/giveaways/GiveawayBoard';
import { Icon } from '@/components/ui/Icon';
import { PageHero, SectionHeader } from '@/components/ui/primitives';
import { dateLabel, num, usd } from '@/lib/format';
import { giveawayKindLabel } from '@/lib/giveaways';
import { getGiveawayTotal, getGiveaways, getStreamers } from '@/server/services/content';
import { toGiveawayWinners } from '@/server/services/views';

export const metadata: Metadata = {
  title: 'Giveaways',
  description: 'Every dollar the FGDR crew has given back to the community — the running total, and who took home what.',
};

export const dynamic = 'force-dynamic';

export default async function GiveawaysPage() {
  const [summary, rows, streamers] = await Promise.all([getGiveawayTotal(), getGiveaways(60), getStreamers()]);
  const winners = toGiveawayWinners(rows, streamers);
  const byId = new Map(streamers.map((s) => [s.id, s]));

  return (
    <>
      <PageHero
        eyebrow="Given back to the community"
        title={
          <>
            The <span className="gold-text">giveaway</span> board
          </>
        }
        lede="Tips, bonus buys, raffle payouts — all of it, logged as it happens."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2rem, 1.5rem + 2vw, 3.5rem)' }}>
        <div className="container">
          <div className="gv-total reveal">
            <span className="gv-total__glow" aria-hidden="true" />
            <p className="gv-total__label">Total given away</p>
            <GiveawayTotal total={summary.total} />
            <p className="gv-total__sub">
              across {num(summary.count)} logged {summary.count === 1 ? 'payout' : 'payouts'}
              {summary.baseline > 0 ? ` · plus ${usd(summary.baseline)} handed out before the board went live` : ''}
            </p>
            {summary.note ? <p className="gv-total__note">{summary.note}</p> : null}
          </div>
        </div>
      </section>

      <section className="section section--sm">
        <div className="container">
          <SectionHeader
            eyebrow="Most recent"
            title="Last winners"
            lede="Swipe or use the arrows — the newest payout is first."
          />
          <div className="reveal">
            <WinnerSlider winners={winners} />
          </div>
        </div>
      </section>

      {rows.length ? (
        <section className="section section--sm">
          <div className="container">
            <SectionHeader eyebrow="The full log" title="Every payout" />
            <div className="panel reveal table-scroll">
              <table className="admin-table gv-log">
                <thead>
                  <tr>
                    <th>Winner</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <b>{g.winnerHandle}</b>
                        {g.note ? <p className="muted">{g.note}</p> : null}
                      </td>
                      <td className="tabular gold-text">{usd(g.amount)}</td>
                      <td>{giveawayKindLabel(g.kind)}</td>
                      <td>{g.streamerId ? (byId.get(g.streamerId)?.displayName ?? 'FGDR') : 'FGDR crew'}</td>
                      <td className="muted">{dateLabel(g.occurredAt, 'UTC')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--sm">
        <div className="container">
          <div className="panel reveal" style={{ padding: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem)', textAlign: 'center' }}>
            <p className="kicker">Want in?</p>
            <p className="lede" style={{ margin: '0.6rem auto 1.5rem', maxWidth: '46ch' }}>
              Giveaways run live on stream. Raffles and challenges are the ones you can enter right now.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link className="btn btn--gold" href="/raffles">
                <Icon name="ticket" />
                See open raffles
              </Link>
              <Link className="btn btn--ghost" href="/live">
                <span className="live-dot" aria-hidden="true" />
                Watch live
              </Link>
            </div>
          </div>

          <p className="fineprint">
            Amounts are logged by FGDR staff after each payout. Winners are shown by the handle they asked to be credited
            under. 18+ only — please gamble responsibly.
          </p>
        </div>
      </section>
    </>
  );
}
