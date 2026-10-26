import type { Metadata } from 'next';
import Link from 'next/link';
import { bestMulti, currentHunt, huntBonuses, huntStats, huntWinnerName, isOpened, listHunts } from '@/server/services/hunts';
import { formatUsd } from '@/lib/format';
import { ConfirmSubmit } from '@/components/admin/ConfirmSubmit';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { deleteHuntAction } from '@/server/actions/hunts';
import { endedEarly, isLocalHunt } from '@/server/services/hunt-admin';

export const metadata: Metadata = { title: 'Hunt history' };

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`;

/** Every hunt before the current one (hidden test hunts included), newest first. Click one for its full bonus list. */
export default async function HuntHistory({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [all, current] = await Promise.all([listHunts(true), currentHunt()]);
  const rows = all.filter((h) => h.id !== current?.id);
  const winners = await Promise.all(rows.map(huntWinnerName));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/hunts" className="meta">
          ← Current hunt
        </Link>
        <h1 className="admin__title">Hunt history</h1>
        <p className="admin__sub">{rows.length} previous hunt{rows.length === 1 ? '' : 's'}. Click a hunt for every slot that got in and how each paid.</p>
      </div>
      <Flash {...flash} />

      {rows.length === 0 ? (
        <div className="emptyq">No previous hunts yet.</div>
      ) : (
        <div className="card" style={{ padding: '6px 12px' }}>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Hunt</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Start</th>
                  <th style={{ textAlign: 'right' }}>Bonuses</th>
                  <th style={{ textAlign: 'right' }}>Won</th>
                  <th style={{ textAlign: 'right' }}>Profit</th>
                  <th>Best multi</th>
                  <th>Highest payout</th>
                  <th>Closest guess</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((h, i) => {
                  const s = huntStats(h);
                  const bonuses = huntBonuses(h);
                  const opened = bonuses.filter(isOpened);
                  const won = s.totalWinnings ?? 0;
                  const profit = s.profitLoss ?? won - h.startCost;
                  const best = bestMulti(h);
                  const bestSlot = opened.find((b) => (b.multiplier ?? 0) === best);
                  const top = opened.reduce<(typeof opened)[number] | null>((t, b) => ((b.payout ?? 0) > (t?.payout ?? 0) ? b : t), null);
                  return (
                    <tr key={h.id}>
                      <td>
                        <Link href={`/admin/hunts/${encodeURIComponent(h.id)}`} style={{ fontWeight: 600 }}>
                          {h.title}
                        </Link>{' '}
                        {!h.completed ? <span className="tag tag--warn">unfinished</span> : endedEarly(h) ? <span className="tag tag--warn">ended early</span> : null}
                        {h.hidden ? <span className="tag tag--danger">hidden</span> : null}
                        <div className="meta">{h.casino ?? '—'}</div>
                      </td>
                      <td className="meta">{h.remoteCreatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatUsd(h.startCost)}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {opened.length}/{s.bonusCount ?? bonuses.length}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {money2(won)}
                      </td>
                      <td className="num" style={{ textAlign: 'right', color: profit >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {profit >= 0 ? '+' : '−'}
                        {money2(Math.abs(profit))}
                      </td>
                      <td>
                        {best ? (
                          <>
                            <b className="num" style={{ color: 'var(--medal-gold)' }}>{multi(best)}</b>
                            <div className="meta">{bestSlot?.slotName}</div>
                          </>
                        ) : (
                          <span className="meta">—</span>
                        )}
                      </td>
                      <td>
                        {top ? (
                          <>
                            <b className="num">{money2(top.payout ?? 0)}</b>
                            <div className="meta">{top.slotName}</div>
                          </>
                        ) : (
                          <span className="meta">—</span>
                        )}
                      </td>
                      <td className="meta">{h.settledAt ? (winners[i] ?? 'nobody') : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {/* Same rule as the service: bonushunt.gg hunts sync back in, and a hunt that paid a prize stays on record. */}
                        {isLocalHunt(h) && !(h.winnerUserId && h.guessPrize) ? (
                          <form action={deleteHuntAction}>
                            <input type="hidden" name="huntId" value={h.id} />
                            <input type="hidden" name="back" value="/admin/hunts/history" />
                            <ConfirmSubmit className="btn btn--danger-ghost" message={`Delete “${h.title}” with its bonuses and guesses? This can't be undone.`}>
                              Delete
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
