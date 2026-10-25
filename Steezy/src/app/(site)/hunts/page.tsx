import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { guessAction } from '@/server/actions/hunts';
import { getCurrentUser } from '@/server/auth/session';
import { requestersBySlot, requestsFor, requestsOpen } from '@/server/services/hunt-requests';
import {
  bestMulti,
  currentHunt,
  guessCount,
  guessList,
  guessingOpen,
  huntBonuses,
  huntStats,
  huntWinnerName,
  isOpened,
  myGuess,
  type HuntBonus,
} from '@/server/services/hunts';
import { artFor, slotArt, slotKey } from '@/server/services/slot-art';
import { openForRequests } from '@/server/services/tournaments';
import { formatBet, formatUsd } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Bonus hunt',
  description: 'The live bonus hunt: every bonus, what it paid, the running profit, slot suggestions from chat and guess the balance.',
};

const GUESS_MSG: Record<string, { text: string; ok: boolean }> = {
  saved: { text: 'Guess saved. Good luck!', ok: true },
  updated: { text: 'Guess updated — your newest guess is the one that counts.', ok: true },
  closed: { text: 'Guessing is closed for this hunt.', ok: false },
  blocked: { text: 'Your account can’t take part right now.', ok: false },
  invalid: { text: 'Enter an amount like 4200 or 4.2k.', ok: false },
  no_hunt: { text: 'There’s no hunt to guess on right now.', ok: false },
};

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${money2(Math.abs(n))}`;
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function HuntPage({ searchParams }: { searchParams: Promise<{ guess?: string }> }) {
  const { guess } = await searchParams;
  const [hunt, user, art, tournament] = await Promise.all([currentHunt(), getCurrentUser(), slotArt(), openForRequests()]);
  const message = guess ? GUESS_MSG[guess] : null;

  const s = hunt ? huntStats(hunt) : null;
  const bonuses = hunt ? huntBonuses(hunt) : [];
  const final = hunt?.completed ? (s?.totalWinnings ?? null) : null;
  const [count, mine, winnerName, pending, requesters, closest] = await Promise.all([
    hunt ? guessCount(hunt.id) : 0,
    hunt && user ? myGuess(hunt.id, user.id) : null,
    hunt ? huntWinnerName(hunt) : null,
    hunt && requestsOpen(hunt) ? requestsFor(hunt.id) : [],
    hunt ? requestersBySlot(hunt.id) : new Map<string, string>(),
    hunt?.settledAt && final !== null ? guessList(hunt.id, final).then((l) => l.slice(0, 10)) : [],
  ]);

  const live = Boolean(hunt && !hunt.completed);
  const phase = !hunt ? 'Bonus hunt' : hunt.completed ? 'Finished' : hunt.isOpening ? 'Opening now' : 'Collecting bonuses';
  const opened = bonuses.filter(isOpened);
  const totalBet = bonuses.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const won = s?.totalWinnings ?? 0;
  const profit = hunt ? (s?.profitLoss ?? won - hunt.startCost) : 0;
  const best = opened.reduce<HuntBonus | null>((top, b) => ((b.multiplier ?? 0) > (top?.multiplier ?? 0) ? b : top), null);
  // A tournament taking sign-ups gets `!sr` first, so hunt suggestions pause meanwhile.
  const srOpen = hunt ? requestsOpen(hunt) && !tournament : false;

  return (
    <div className="container page" style={{ gap: 28 }}>
      {live ? <AutoRefresh seconds={10} /> : null}

      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">
          {hunt?.isOpening ? <span className="dot dot--live" aria-hidden="true" /> : null}
          {phase}
        </span>
        <h1 className="page__title">{hunt?.title ?? 'Bonus hunt'}</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '62ch' }}>
          {live
            ? 'Live from stream — this page updates itself.'
            : hunt
              ? `Finished ${shortDate(hunt.remoteCreatedAt)}. The next hunt starts on stream.`
              : 'No hunt has run yet. The next one starts on stream.'}{' '}
          {hunt?.casino ? `Played on ${hunt.casino}, tracked on bonushunt.gg. ` : ''}
          See also the <Link href="/tournament">slot tournament</Link>.
        </p>
      </div>

      {message ? <p className={`notice ${message.ok ? 'notice--ok' : 'notice--danger'}`}>{message.text}</p> : null}

      {hunt && s ? (
        <>
          <section className="statgrid">
            <Stat label="Start" value={formatUsd(hunt.startCost)} />
            <Stat label="Bonuses" value={`${opened.length}/${s.bonusCount ?? bonuses.length}`} sub={totalBet ? `${money2(totalBet)} in bets` : undefined} />
            <Stat label="Won" value={money2(won)} tone="accent" />
            <Stat label="Profit" value={signed(profit)} tone={profit >= 0 ? 'accent' : 'danger'} />
            <Stat label="Average" value={s.currentAverageMultiplier ? multi(s.currentAverageMultiplier) : '—'} />
            <Stat
              label="Break-even"
              value={!hunt.completed && s.averagePayoutRequired ? multi(s.averagePayoutRequired) : '—'}
              sub={!hunt.completed && s.averagePayoutRequired ? 'needed on what’s left' : undefined}
              tone="gold"
            />
            {best ? <Stat label="Best win" value={multi(best.multiplier ?? bestMulti(hunt))} sub={`${best.slotName}${best.payout ? ` · ${money2(best.payout)}` : ''}`} tone="accent" /> : null}
          </section>

          <section className="huntjoin">
            <div className="card stack" style={{ gap: 10 }}>
              <div className="hj-head">
                <span className={`tag ${srOpen ? 'tag--accent' : 'tag--neutral'}`}>{srOpen ? 'Open' : 'Closed'}</span>
                <h3>Suggest a slot</h3>
              </div>
              <p className="meta">
                Type <code>!sr slot name</code> in Kick chat while bonuses are being collected. Up to three of yours can wait in the queue
                at once; Steezy picks from the list on stream.
                {tournament ? (
                  <>
                    {' '}
                    Right now <code>!sr</code> goes to the <Link href="/tournament">{tournament.name}</Link> tournament instead.
                  </>
                ) : null}
              </p>
            </div>

            <div className="card stack" style={{ gap: 10 }}>
              <div className="hj-head">
                <span className={`tag ${guessingOpen(hunt) ? 'tag--accent' : hunt.settledAt ? 'tag--warn' : 'tag--neutral'}`}>
                  {guessingOpen(hunt) ? 'Open' : hunt.settledAt ? 'Settled' : 'Locked'}
                </span>
                <h3>Guess the balance</h3>
              </div>
              <p className="meta">
                Guess what the hunt pays back in total — here or with <code>!guess 4200</code> in chat (Kick account linked). Closest
                guess wins{hunt.guessPrize ? <b style={{ color: 'var(--medal-gold)' }}> {hunt.guessPrize}</b> : null}. Your latest guess
                counts until the opening starts.
              </p>
              {guessingOpen(hunt) ? (
                user ? (
                  <form action={guessAction} className="row" style={{ gap: 8 }}>
                    <input type="hidden" name="huntId" value={hunt.id} />
                    <label className="visually-hidden" htmlFor="guess-amount">
                      Your guess
                    </label>
                    <input id="guess-amount" name="amount" className="input" placeholder="e.g. 4200" inputMode="decimal" style={{ flex: '1 1 140px' }} required />
                    <button className="btn btn--primary" type="submit">
                      {mine ? 'Update guess' : 'Guess'}
                    </button>
                  </form>
                ) : (
                  <a className="btn btn--primary" href="/api/auth/discord?returnTo=/hunts" style={{ alignSelf: 'flex-start' }}>
                    Log in to guess
                  </a>
                )
              ) : null}
              <span className="meta">
                <b style={{ color: 'var(--color-text)' }}>{count}</b> {count === 1 ? 'guess' : 'guesses'}
                {mine ? ` · yours: ${money2(mine.amount)}` : ''}
                {hunt.settledAt && final !== null ? (
                  <>
                    {' '}
                    · final balance <b style={{ color: 'var(--color-text)' }}>{money2(final)}</b> ·{' '}
                    {winnerName ? (
                      <>
                        winner <b style={{ color: 'var(--medal-gold)' }}>{winnerName}</b>
                      </>
                    ) : (
                      'nobody guessed'
                    )}
                  </>
                ) : null}
              </span>
            </div>
          </section>

          <section className="stack" style={{ gap: 12, width: '100%', maxWidth: 880 }}>
            <h2 className="sec-title">Bonuses</h2>
            {bonuses.length === 0 ? (
              <div className="emptyq">No bonuses collected yet.</div>
            ) : (
              <div className="card" style={{ padding: '6px 12px' }}>
                <div className="table-wrap">
                  <table className="table" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>#</th>
                        <th>Slot</th>
                        <th style={{ textAlign: 'right' }}>Bet</th>
                        <th style={{ textAlign: 'right' }}>Payout</th>
                        <th style={{ textAlign: 'right' }}>Multi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonuses.map((b, i) => {
                        const now = hunt.isOpening && b.id === hunt.currentOpeningSlot;
                        const by = requesters.get(slotKey(b.slotName));
                        const m = isOpened(b) ? (b.multiplier ?? (b.betSize ? (b.payout ?? 0) / b.betSize : 0)) : null;
                        return (
                          <tr key={b.id} className={now ? 'is-now' : undefined}>
                            <td className="meta num">{i + 1}</td>
                            <td>
                              <div className="slotcell">
                                <SlotThumb name={b.slotName} image={b.slotImage ?? null} size={40} />
                                <span>
                                  <b>
                                    {b.slotName}
                                    {now ? <span className="tag tag--accent" style={{ marginLeft: 8 }}>Opening</span> : null}
                                    {best?.id === b.id ? <span className="tag tag--warn" style={{ marginLeft: 8 }}>Best</span> : null}
                                  </b>
                                  <small>
                                    {b.provider || '—'}
                                    {by ? ` · requested by ${by}` : ''}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td className="num" style={{ textAlign: 'right' }}>
                              {b.betSize ? formatBet(b.betSize) : '—'}
                            </td>
                            <td className="num" style={{ textAlign: 'right' }}>
                              {isOpened(b) ? money2(b.payout ?? 0) : '—'}
                            </td>
                            <td
                              className="num"
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: m === null || m < 20 ? 'var(--color-muted)' : m >= 100 ? 'var(--medal-gold)' : 'var(--color-text)',
                              }}
                            >
                              {m === null ? '—' : multi(m)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {pending.length ? (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="sec-title">Suggested by chat</h2>
              <div className="reqgrid">
                {pending.map((r) => (
                  <div className="slotcell reqcard" key={r.id}>
                    <SlotThumb name={r.slot} image={artFor(art, r.slot)} size={40} />
                    <span>
                      <b>{r.slot}</b>
                      <small>{r.kickUsername}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {closest.length ? (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="sec-title">Closest guesses</h2>
              <div className="card" style={{ padding: '6px 12px' }}>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th style={{ textAlign: 'right' }}>Guess</th>
                        <th style={{ textAlign: 'right' }}>Off by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closest.map((g) => (
                        <tr key={g.userId}>
                          <td>
                            {g.name}
                            {g.userId === hunt.winnerUserId ? (
                              <span className="tag tag--warn" style={{ marginLeft: 8 }}>
                                Winner
                              </span>
                            ) : null}
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {money2(g.amount)}
                          </td>
                          <td className="num meta" style={{ textAlign: 'right' }}>
                            {money2(Math.abs(g.amount - (final ?? 0)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="emptyq">No bonus hunts yet — they show up here as soon as Steezy starts one on bonushunt.gg.</div>
      )}

    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'accent' | 'gold' | 'danger' }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value num${tone ? ` stat__value--${tone}` : ''}`}>{value}</div>
      {sub ? <div className="stat__sub">{sub}</div> : null}
    </div>
  );
}
