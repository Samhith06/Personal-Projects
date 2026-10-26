import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SlotArt } from '@/components/stream-games/SlotArt';
import { bonusesFor, featuredHunt, finishedHunts, guessesFor, huntStats, requestsFor } from '@/server/services/hunts';
import { dateShort, money, mult } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Bonus Hunt',
  description: 'The live bonus hunt on SteezySpins: every bonus, what it paid, the running profit, slot requests from chat and guess the balance.',
};

const PHASE = { collecting: 'Collecting bonuses', opening: 'Opening now', finished: 'Finished' } as const;

/** The bonus hunt (ported from MattySpins' /hunt). */
export default async function HuntPage() {
  const [hunt, history] = await Promise.all([featuredHunt(), finishedHunts(8)]);
  const [bonuses, requests, guesses] = hunt ? await Promise.all([bonusesFor(hunt.id), requestsFor(hunt.id, 'pending'), guessesFor(hunt.id)]) : [[], [], []];
  const stats = hunt ? huntStats(hunt, bonuses) : null;
  const live = hunt != null && hunt.status !== 'finished';

  // The bonus being opened is the first without a payout, in hunt order.
  const current = hunt?.status === 'opening' ? bonuses.find((b) => b.payout == null) : undefined;

  const final = hunt?.finalBalance;
  const closest =
    hunt?.gtbStatus === 'settled' && final != null ? [...guesses].sort((a, b) => Math.abs(a.guess - final) - Math.abs(b.guess - final)).slice(0, 10) : [];
  const past = history.filter((h) => h.id !== hunt?.id);

  return (
    <div className="container page" style={{ gap: 28 }}>
      {live ? <AutoRefresh seconds={10} /> : null}

      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">
          {hunt?.status === 'opening' ? <span className="dot dot--live" aria-hidden="true" /> : null}
          {hunt ? PHASE[hunt.status] : 'Bonus hunt'}
        </span>
        <h1 className="page__title">{hunt?.title ?? 'Bonus Hunt'}</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '62ch' }}>
          {live
            ? 'Live from stream. This page updates itself.'
            : hunt
              ? `Finished ${hunt.finishedAt ? dateShort(hunt.finishedAt) : ''}. The next hunt starts on stream.`
              : 'No hunt has run yet. The next one starts on stream.'}{' '}
          See also the <Link href="/tournament">slot tournament</Link>.
        </p>
      </div>

      {hunt && stats ? (
        <>
          <section className="statgrid">
            <Stat label="Start" value={money(hunt.startCost)} />
            <Stat label="Bonuses" value={`${stats.opened}/${stats.bonuses}`} sub={`${money(stats.totalBet)} in bets`} />
            <Stat label="Won" value={money(stats.won)} tone="accent" />
            <Stat label="Profit" value={`${stats.profit >= 0 ? '+' : ''}${money(stats.profit)}`} tone={stats.profit >= 0 ? 'accent' : 'danger'} />
            <Stat label="Average" value={stats.averageX == null ? '—' : mult(stats.averageX)} />
            <Stat label="Break-even" value={stats.breakEvenX == null ? '—' : mult(stats.breakEvenX)} sub={stats.breakEvenX == null ? undefined : 'needed on what is left'} tone="gold" />
            {stats.best && stats.best.payout != null ? (
              <Stat label="Best win" value={mult(stats.best.payout / stats.best.bet)} sub={`${stats.best.slotName} · ${money(stats.best.payout)}`} tone="accent" />
            ) : null}
          </section>

          {/* Taking part -------------------------------------------------- */}
          <section className="huntjoin">
            <div className="card stack" style={{ gap: 10 }}>
              <div className="hj-head">
                <span className={`tag ${hunt.status === 'collecting' && hunt.requestsOpen ? 'tag--accent' : 'tag--neutral'}`}>
                  {hunt.status === 'collecting' && hunt.requestsOpen ? 'Open' : 'Closed'}
                </span>
                <h3>Suggest a slot</h3>
              </div>
              <p className="meta">
                Type <code>!sr slot name</code> in Kick chat while bonuses are being collected. Suggest as many slots as you like — each one joins
                the queue.
              </p>
            </div>
            <div className="card stack" style={{ gap: 10 }}>
              <div className="hj-head">
                <span className={`tag ${hunt.gtbStatus === 'open' ? 'tag--accent' : hunt.gtbStatus === 'settled' ? 'tag--warn' : 'tag--neutral'}`}>
                  {hunt.gtbStatus === 'open' ? 'Open' : hunt.gtbStatus === 'settled' ? 'Settled' : hunt.gtbStatus === 'locked' ? 'Locked' : 'Not open'}
                </span>
                <h3>Guess the balance</h3>
              </div>
              <p className="meta">
                Type <code>!gtb 1234.56</code> in chat to guess what the hunt pays back in total. Closest guess wins
                {hunt.gtbPrize ? (
                  <>
                    {' '}
                    <b style={{ color: 'var(--medal-gold)' }}>{hunt.gtbPrize}</b>
                  </>
                ) : null}
                . Your latest guess counts until guessing locks. To win, your Kick account has to be <Link href="/me/link">linked</Link>.
              </p>
              <p style={{ fontSize: 14 }}>
                <b>{guesses.length.toLocaleString('en-US')}</b> {guesses.length === 1 ? 'guess' : 'guesses'}
                {hunt.gtbStatus === 'settled' && final != null ? (
                  <>
                    {' '}
                    · final balance <b>{money(final)}</b> ·{' '}
                    {hunt.gtbWinner ? (
                      <>
                        winner <b style={{ color: 'var(--medal-gold)' }}>{hunt.gtbWinner.name}</b>
                      </>
                    ) : (
                      'no linked account guessed'
                    )}
                  </>
                ) : null}
              </p>
            </div>
          </section>

          {/* The bonuses -------------------------------------------------- */}
          <section className="stack" style={{ gap: 12 }}>
            <h2 className="sec-title">Bonuses</h2>
            {bonuses.length === 0 ? (
              <div className="emptyq">No bonuses collected yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Slot</th>
                      <th style={{ textAlign: 'right' }}>Bet</th>
                      <th style={{ textAlign: 'right' }}>Payout</th>
                      <th style={{ textAlign: 'right' }}>Multi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonuses.map((b, i) => {
                      const isBest = stats.best?.id === b.id;
                      const x = b.payout == null ? null : b.payout / b.bet;
                      return (
                        <tr key={b.id} className={b.id === current?.id ? 'is-now' : undefined}>
                          <td className="meta num">{i + 1}</td>
                          <td>
                            <div className="slotcell">
                              <SlotArt src={b.imageUrl} name={b.slotName} />
                              <span>
                                <b>
                                  {b.slotName}
                                  {b.id === current?.id ? (
                                    <span className="tag tag--accent" style={{ marginLeft: 8 }}>
                                      Opening
                                    </span>
                                  ) : null}
                                  {isBest ? (
                                    <span className="tag tag--warn" style={{ marginLeft: 8 }}>
                                      Best
                                    </span>
                                  ) : null}
                                </b>
                                <small>
                                  {b.provider || '—'}
                                  {b.requestedBy ? ` · requested by ${b.requestedBy}` : ''}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {money(b.bet)}
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {b.payout == null ? '—' : money(b.payout)}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: x == null || x < 20 ? 'var(--color-muted)' : x >= 100 ? 'var(--medal-gold)' : undefined,
                            }}
                          >
                            {x == null ? '—' : mult(x)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {hunt.status === 'collecting' && requests.length > 0 ? (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="sec-title">Suggested by chat</h2>
              <div className="reqgrid">
                {requests.map((r) => (
                  <div className="slotcell reqcard" key={r.id}>
                    <SlotArt src={r.imageUrl} name={r.slotName ?? r.query} />
                    <span>
                      <b>{r.slotName ?? r.query}</b>
                      <small>{r.kickUsername}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {closest.length > 0 ? (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="sec-title">Closest guesses</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Chatter</th>
                      <th style={{ textAlign: 'right' }}>Guess</th>
                      <th style={{ textAlign: 'right' }}>Off by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closest.map((g) => (
                      <tr key={g.kickUserId}>
                        <td>
                          {g.kickUsername}
                          {hunt.gtbWinner?.kickUserId === g.kickUserId ? (
                            <span className="tag tag--warn" style={{ marginLeft: 8 }}>
                              Winner
                            </span>
                          ) : !g.linked ? (
                            <span className="meta" style={{ marginLeft: 8 }}>
                              not linked
                            </span>
                          ) : null}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {money(g.guess)}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {money(Math.abs(g.guess - (final ?? 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="emptyq">Nothing to show yet.</div>
      )}

      {past.length > 0 ? (
        <section className="stack" style={{ gap: 12 }}>
          <div>
            <span className="kicker">History</span>
            <h2 className="sec-title">Past hunts</h2>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Hunt</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Bonuses</th>
                  <th style={{ textAlign: 'right' }}>Start</th>
                  <th style={{ textAlign: 'right' }}>Won</th>
                  <th style={{ textAlign: 'right' }}>Profit</th>
                  <th style={{ textAlign: 'right' }}>Best</th>
                </tr>
              </thead>
              <tbody>
                {past.map((h) => {
                  const profit = h.won - h.startCost;
                  return (
                    <tr key={h.id}>
                      <td>{h.title}</td>
                      <td className="meta">{h.finishedAt ? dateShort(h.finishedAt) : '—'}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.bonuses}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {money(h.startCost)}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {money(h.won)}
                      </td>
                      <td className="num" style={{ textAlign: 'right', color: profit >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {profit >= 0 ? '+' : ''}
                        {money(profit)}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.bestX == null ? '—' : mult(h.bestX)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'accent' | 'gold' | 'danger' }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value${tone ? ` stat__value--${tone}` : ''}`}>{value}</div>
      {sub ? <div className="stat__sub">{sub}</div> : null}
    </div>
  );
}
