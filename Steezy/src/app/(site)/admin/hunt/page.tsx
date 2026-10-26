import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { CopyLink } from '@/components/admin/CopyLink';
import {
  AddBonusForm,
  DeleteHuntButton,
  HuntSettings,
  HuntSwitches,
  MarkPrizePaidButton,
  PayoutInput,
  RemoveBonusButton,
  RequestActions,
  StartHuntForm,
} from '@/components/admin/HuntControls';
import { SlotArt } from '@/components/stream-games/SlotArt';
import { bonusesFor, featuredHunt, guessesFor, huntStats, requestsFor } from '@/server/services/hunts';
import { dateTime, money, mult } from '@/lib/format';
import { siteUrl } from '@/lib/env';

export const metadata: Metadata = { title: 'Bonus hunt' };

const STATUS_LABEL = { collecting: 'Collecting', opening: 'Opening', finished: 'Finished' } as const;
const GTB_LABEL = { closed: 'Guessing not open', open: 'Guessing open', locked: 'Guessing locked', settled: 'Guesses settled' } as const;

/** The bonus hunt, run from here (ported from MattySpins' /admin/hunt). */
export default async function AdminHuntPage() {
  const hunt = await featuredHunt();
  const [bonuses, requests, guesses] = hunt ? await Promise.all([bonusesFor(hunt.id), requestsFor(hunt.id, 'pending'), guessesFor(hunt.id)]) : [[], [], []];
  const stats = hunt ? huntStats(hunt, bonuses) : null;

  // Once finished, guesses read closest-first against the real total; before
  // that, in the order they arrived.
  const total = hunt?.finalBalance ?? stats?.won ?? 0;
  const ordered = hunt?.status === 'finished' ? [...guesses].sort((a, b) => Math.abs(a.guess - total) - Math.abs(b.guess - total)) : guesses;
  const unpaidPrize = hunt?.gtbStatus === 'settled' && hunt.gtbWinner?.userId && hunt.gtbPrize && !hunt.gtbPrizePaidAt;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* While a hunt runs, chat's !sr requests and guesses arrive on their own;
          the screen picks them up without the streamer reloading it. */}
      {hunt && hunt.status !== 'finished' ? <AutoRefresh seconds={5} /> : null}
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Bonus hunt</h1>
        <p className="admin__sub">
          Chat suggests with <b>!sr &lt;slot&gt;</b> and guesses with <b>!gtb &lt;amount&gt;</b>. The public page is <Link href="/hunt">/hunt</Link>; slots
          come from the <Link href="/admin/slots">catalog</Link>.
        </p>
      </div>

      {!hunt || (hunt.status === 'finished' && (hunt.gtbStatus === 'closed' || hunt.gtbStatus === 'settled')) ? <StartHuntForm /> : null}

      <OverlayLinks />

      {!hunt || !stats ? (
        <div className="emptyq">No hunt yet.</div>
      ) : (
        <>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="hunt-tags">
              <span className={`tag ${hunt.status === 'finished' ? 'tag--neutral' : 'tag--accent'}`}>{STATUS_LABEL[hunt.status]}</span>
              <span className="tag tag--neutral">{GTB_LABEL[hunt.gtbStatus]}</span>
              {hunt.status === 'collecting' ? <span className="tag tag--neutral">{hunt.requestsOpen ? '!sr open' : '!sr closed'}</span> : null}
              {hunt.gtbPrize ? <span className="tag tag--warn">{hunt.gtbPrize} prize</span> : null}
            </div>

            {hunt.settledAt ? <strong className="hunt-h">{hunt.title}</strong> : <HuntSettings huntId={hunt.id} title={hunt.title} startCost={hunt.startCost} />}

            <HuntSwitches
              huntId={hunt.id}
              status={hunt.status}
              requestsOpen={hunt.requestsOpen}
              gtbStatus={hunt.gtbStatus}
              gtbPrize={hunt.gtbPrize}
              unopened={stats.bonuses - stats.opened}
            />

            {hunt.gtbStatus === 'settled' ? (
              <p>
                Final balance <b>{money(hunt.finalBalance ?? 0)}</b> ·{' '}
                {hunt.gtbWinner ? (
                  <>
                    winner <b>{hunt.gtbWinner.name}</b>
                    {hunt.gtbPrize ? (hunt.gtbPrizePaidAt ? `, paid ${hunt.gtbPrize}` : `, owed ${hunt.gtbPrize}`) : ''}
                  </>
                ) : (
                  'no linked account guessed'
                )}
              </p>
            ) : null}

            {/* A hunt whose prize was paid is the record of that payment, so it
                has no delete button (the service refuses it too). */}
            {hunt.gtbPrizePaidAt && !unpaidPrize ? null : (
              <div className="hunt-danger">
                {unpaidPrize ? <MarkPrizePaidButton huntId={hunt.id} label={`Mark ${hunt.gtbPrize} paid`} /> : null}
                {hunt.gtbPrizePaidAt ? null : <DeleteHuntButton huntId={hunt.id} title={hunt.title} />}
              </div>
            )}
          </section>

          <div className="admin-kpis hunt-kpis">
            <Kpi label="Start" value={money(hunt.startCost)} />
            <Kpi label="Bonuses" value={`${stats.opened}/${stats.bonuses}`} note={`${money(stats.totalBet)} in bets`} />
            <Kpi label="Won" value={money(stats.won)} tone="gold" />
            <Kpi label="Profit" value={money(stats.profit)} tone={stats.profit >= 0 ? 'accent' : 'warn'} />
            <Kpi label="Average" value={stats.averageX == null ? '—' : mult(stats.averageX)} />
            <Kpi label="Break-even" value={stats.breakEvenX == null ? '—' : mult(stats.breakEvenX)} note="needed per $ left" />
          </div>

          {hunt.status !== 'finished' ? <AddBonusForm huntId={hunt.id} /> : null}

          <section className="stack" style={{ gap: 10 }}>
            <strong className="hunt-h">Bonuses</strong>
            {bonuses.length === 0 ? (
              <div className="emptyq">No bonuses yet. Add them above, or from chat requests below.</div>
            ) : (
              <div className="table-wrap">
                <table className="table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Slot</th>
                      <th style={{ textAlign: 'right' }}>Bet</th>
                      <th style={{ textAlign: 'right' }}>Payout</th>
                      <th style={{ textAlign: 'right' }}>Multi</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bonuses.map((b, i) => (
                      <tr key={b.id}>
                        <td className="meta num">{i + 1}</td>
                        <td>
                          <div className="slotcell">
                            <SlotArt src={b.imageUrl} name={b.slotName} />
                            <span>
                              <b>{b.slotName}</b>
                              <small>
                                {b.provider || '—'}
                                {b.requestedBy ? ` · !sr ${b.requestedBy}` : ''}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {money(b.bet)}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {hunt.status === 'opening' ? <PayoutInput bonusId={b.id} payout={b.payout} /> : b.payout == null ? '—' : money(b.payout)}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {b.payout == null ? '—' : mult(b.payout / b.bet)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{hunt.status === 'collecting' ? <RemoveBonusButton bonusId={b.id} /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {hunt.status === 'collecting' ? (
            <section className="stack" style={{ gap: 10 }}>
              <strong className="hunt-h">
                Chat requests <span className="meta">({requests.length} waiting)</span>
              </strong>
              {requests.length === 0 ? (
                <div className="emptyq">{hunt.requestsOpen ? 'Nobody has typed !sr yet.' : '!sr is closed.'}</div>
              ) : (
                <div className="card" style={{ padding: '4px 18px' }}>
                  {requests.map((r) => (
                    <div className="admin-row" key={r.id}>
                      <div className="slotcell admin-row__body">
                        <SlotArt src={r.imageUrl} name={r.slotName ?? r.query} />
                        <span>
                          <b>{r.slotName ?? r.query}</b>
                          <small>
                            {r.slotName ? `${r.provider || '—'} · ` : 'not in catalog · '}
                            {r.kickUsername} typed “{r.query}” · {dateTime(r.createdAt)}
                          </small>
                        </span>
                      </div>
                      <RequestActions huntId={hunt.id} requestId={r.id} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className="stack" style={{ gap: 10 }}>
            <strong className="hunt-h">
              Guesses <span className="meta">({guesses.length})</span>
            </strong>
            {guesses.length === 0 ? (
              <div className="emptyq">No guesses.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Chatter</th>
                      <th style={{ textAlign: 'right' }}>Guess</th>
                      {hunt.status === 'finished' ? <th style={{ textAlign: 'right' }}>Off by</th> : null}
                      <th>Linked</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((g) => (
                      <tr key={g.kickUserId}>
                        <td>
                          {g.kickUsername}
                          {hunt.gtbWinner?.kickUserId === g.kickUserId ? (
                            <span className="tag tag--warn" style={{ marginLeft: 8 }}>
                              Winner
                            </span>
                          ) : null}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {money(g.guess)}
                        </td>
                        {hunt.status === 'finished' ? (
                          <td className="num meta" style={{ textAlign: 'right' }}>
                            {money(Math.abs(g.guess - total))}
                          </td>
                        ) : null}
                        <td style={{ color: g.linked ? 'var(--color-accent)' : 'var(--color-muted)' }}>{g.linked ? 'yes' : 'no'}</td>
                        <td className="meta">{dateTime(g.guessedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="meta" style={{ maxWidth: '72ch' }}>
              Only chatters whose Kick account is linked on SteezySpins can win, so the prize goes to the closest linked guess. A tie goes to
              whoever guessed first.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

const OVERLAYS: Array<[string, string, string]> = [
  ['Everything', '', '420 × 1080'],
  ['Stats strip', '?panel=stats', '1200 × 90, or 420 × 170'],
  ['Now opening', '?panel=now', '460 × 150'],
  ['Bonus list', '?panel=bonuses&rows=10', '420 × 560'],
  ['Guess the balance', '?panel=gtb', '420 × 130'],
];

/** The URLs to paste into OBS. Collapsed, because it's set-up-once information on a screen used live. */
function OverlayLinks() {
  return (
    <details className="card hunt-fold">
      <summary>OBS overlays</summary>
      <p className="meta" style={{ margin: '10px 0 12px' }}>
        Add each as a <b>Browser</b> source in OBS at the size shown (it can be resized after). The background is transparent, it updates
        itself every few seconds, and it shows nothing between hunts.
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {OVERLAYS.map(([label, query, size]) => (
          <div key={label} className="overlay-link">
            <b>{label}</b>
            <span className="meta">{size}</span>
            <CopyLink value={siteUrl(`/overlay/hunt${query}`)} />
          </div>
        ))}
      </div>
    </details>
  );
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'accent' | 'gold' | 'warn' }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className={`kpi__value${tone ? ` kpi__value--${tone}` : ''}`}>{value}</div>
      {note ? <div className="kpi__note">{note}</div> : null}
    </div>
  );
}
