import type { Metadata } from 'next';
import { Bracket } from '@/components/hunts/Bracket';
import { guessAction } from '@/server/actions/hunts';
import { getCurrentUser } from '@/server/auth/session';
import {
  bestMulti,
  completedHunts,
  currentHunt,
  guessCount,
  guessingOpen,
  huntBonuses,
  huntStats,
  huntWinnerName,
  isOpened,
  myGuess,
} from '@/server/services/hunts';
import { bracket, featuredTournament, matchWinnerName } from '@/server/services/tournaments';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Bonus hunts & tournaments' };

const GUESS_MSG: Record<string, { text: string; ok: boolean }> = {
  saved: { text: 'Guess saved. Good luck!', ok: true },
  updated: { text: 'Guess updated — your newest guess is the one that counts.', ok: true },
  closed: { text: 'Guessing is closed for this hunt.', ok: false },
  blocked: { text: 'Your account can’t take part right now.', ok: false },
  invalid: { text: 'Enter an amount like 4200 or 4.2k.', ok: false },
  no_hunt: { text: 'There’s no hunt to guess on right now.', ok: false },
};

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`;

export default async function HuntsPage({ searchParams }: { searchParams: Promise<{ guess?: string }> }) {
  const { guess } = await searchParams;
  const [hunt, user, past, tournament] = await Promise.all([currentHunt(), getCurrentUser(), completedHunts(6), featuredTournament()]);
  const message = guess ? GUESS_MSG[guess] : null;

  const [count, mine, winnerName, rounds, pastWinners] = await Promise.all([
    hunt ? guessCount(hunt.id) : 0,
    hunt && user ? myGuess(hunt.id, user.id) : null,
    hunt ? huntWinnerName(hunt) : null,
    tournament ? bracket(tournament.id) : [],
    Promise.all(past.map(huntWinnerName)),
  ]);

  const s = hunt ? huntStats(hunt) : null;
  const bonuses = hunt ? huntBonuses(hunt) : [];
  const status = !hunt ? null : hunt.completed ? 'Finished' : hunt.isOpening ? 'Opening' : 'Collecting bonuses';
  const final = rounds.length ? rounds[rounds.length - 1].matches[0] : null;
  const champion = final ? matchWinnerName(final) : null;

  return (
    <div className="container page" style={{ gap: 32 }}>
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Bonus hunts &amp; tournaments</span>
        <h1 className="page__title">{hunt && !hunt.completed ? 'On stream tonight' : 'Bonus hunts'}</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '58ch' }}>
          Live from bonushunt.gg. Guess the final balance before the opening starts — the closest guess wins.
        </p>
      </div>

      {message ? <p className={`notice ${message.ok ? 'notice--ok' : 'notice--danger'}`}>{message.text}</p> : null}

      {hunt && s ? (
        <section className="hunt-split">
          <article className="card stack" style={{ gap: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className={hunt.isOpening ? 'tag tag--accent' : hunt.completed ? 'tag tag--neutral' : 'tag tag--warn'}>
                {hunt.isOpening ? <span className="dot dot--live" aria-hidden="true" /> : null}
                {hunt.title} · {status}
              </span>
              <span className="meta">{hunt.casino ? `${hunt.casino} · ` : ''}via bonushunt.gg</span>
            </div>
            <div className="hunt-stats">
              <div>
                <span className="meta">Start cost</span>
                <b className="num">{formatUsd(hunt.startCost)}</b>
              </div>
              <div>
                <span className="meta">Bonuses</span>
                <b className="num">
                  {s.openedBonuses ?? 0} / {s.bonusCount ?? bonuses.length}
                </b>
              </div>
              <div>
                <span className="meta">Won so far</span>
                <b className="num" style={{ color: (s.totalWinnings ?? 0) >= hunt.startCost ? 'var(--color-accent)' : undefined }}>
                  {money2(s.totalWinnings ?? 0)}
                </b>
              </div>
              <div>
                <span className="meta">Best multi</span>
                <b className="num" style={{ color: 'var(--color-accent)' }}>
                  {bestMulti(hunt) ? multi(bestMulti(hunt)) : '—'}
                </b>
              </div>
              <div>
                <span className="meta">Avg needed</span>
                <b className="num">{s.averagePayoutRequired ? multi(s.averagePayoutRequired) : '—'}</b>
              </div>
            </div>
            {bonuses.length ? (
              <ol className="slot-list">
                {bonuses.map((b, i) => {
                  const current = hunt.currentOpeningSlot === b.id;
                  return (
                    <li key={b.id} className={`slot-row${current ? ' is-current' : ''}${isOpened(b) ? ' is-opened' : ''}`}>
                      <span className="meta num">{i + 1}</span>
                      {b.slotImage ? <img src={b.slotImage} alt="" width={40} height={40} loading="lazy" /> : <span className="slot-row__ph" />}
                      <span className="slot-row__name">
                        {b.slotName}
                        <span className="meta">{b.provider}</span>
                      </span>
                      <span className="meta num">{b.betSize ? money2(b.betSize) : ''}</span>
                      <span className="num slot-row__result">
                        {current ? 'Opening' : isOpened(b) ? multi(b.multiplier ?? 0) : '—'}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="meta">No bonuses collected yet.</p>
            )}
          </article>

          <aside className="stack" style={{ gap: 20 }}>
            <div className="card stack" style={{ gap: 14 }}>
              <span className="kicker">Guess the balance</span>
              {hunt.completed && hunt.settledAt ? (
                <>
                  <p>
                    Final balance <b className="num">{money2(s.totalWinnings ?? 0)}</b>
                  </p>
                  <p>
                    {winnerName ? (
                      <>
                        Closest guess: <b>{winnerName}</b> with <span className="num">{money2(hunt.winnerGuess ?? 0)}</span>
                      </>
                    ) : (
                      'No guesses this time.'
                    )}
                  </p>
                </>
              ) : guessingOpen(hunt) ? (
                <>
                  <p className="meta">
                    {count} guess{count === 1 ? '' : 'es'} so far{hunt.guessPrize ? ` · prize: ${hunt.guessPrize}` : ''}. Type{' '}
                    <code style={{ color: 'var(--color-accent-400)' }}>!guess 4200</code> in chat or guess here.
                  </p>
                  {user ? (
                    <form action={guessAction} className="row">
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
                  )}
                  {mine ? <span className="meta">Your guess: {money2(mine.amount)}</span> : null}
                </>
              ) : (
                <p className="meta">
                  Guessing is closed{hunt.isOpening ? ' — the opening has started' : ''}. {count} guess{count === 1 ? '' : 'es'} locked in
                  {mine ? `, including yours: ${money2(mine.amount)}` : ''}.
                </p>
              )}
            </div>

            {tournament ? (
              <div className="card stack" style={{ gap: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="kicker">Slot tournament</span>
                  <span className={tournament.status === 'live' ? 'tag tag--accent' : 'tag tag--neutral'}>{tournament.status === 'live' ? 'Live' : tournament.status}</span>
                </div>
                <strong style={{ fontSize: 18 }}>{tournament.name}</strong>
                {tournament.prize ? <span className="meta">Prize: {tournament.prize}</span> : null}
                {champion ? (
                  <span>
                    Champion: <b style={{ color: 'var(--medal-gold)' }}>{champion}</b>
                  </span>
                ) : null}
                <a href="#bracket" style={{ fontSize: 14 }}>
                  View bracket
                </a>
              </div>
            ) : null}
          </aside>
        </section>
      ) : (
        <div className="card">
          <p className="meta">No bonus hunts yet — they show up here as soon as Steezy starts one on bonushunt.gg.</p>
        </div>
      )}

      {tournament && rounds.length ? (
        <section className="stack" id="bracket">
          <h2 style={{ fontSize: 24 }}>{tournament.name}</h2>
          <div className="card" style={{ overflowX: 'auto' }}>
            <Bracket rounds={rounds} />
          </div>
        </section>
      ) : null}

      {past.length ? (
        <section className="stack">
          <h2 style={{ fontSize: 24 }}>Past hunts</h2>
          <div className="card-grid">
            {past.map((h, i) => {
              const ps = huntStats(h);
              const pl = ps.profitLoss ?? (ps.totalWinnings ?? 0) - h.startCost;
              return (
                <article key={h.id} className="card stack" style={{ gap: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{h.title}</strong>
                    <span className="meta">{h.remoteCreatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="hunt-stats hunt-stats--3">
                    <div>
                      <span className="meta">Cost</span>
                      <b className="num">{formatUsd(h.startCost)}</b>
                    </div>
                    <div>
                      <span className="meta">Result</span>
                      <b className="num">{formatUsd(ps.totalWinnings ?? 0)}</b>
                    </div>
                    <div>
                      <span className="meta">Profit</span>
                      <b className="num" style={{ color: pl >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {pl >= 0 ? '+' : '−'}
                        {formatUsd(Math.abs(pl))}
                      </b>
                    </div>
                  </div>
                  <span className="meta">
                    {bestMulti(h) ? `Best ${multi(bestMulti(h))} · ` : ''}Closest guess: {pastWinners[i] ?? '—'}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
