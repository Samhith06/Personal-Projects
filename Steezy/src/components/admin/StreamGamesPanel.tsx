import Link from 'next/link';
import { recordResultAction, toggleGuessing } from '@/server/actions/hunts';
import { activeHunt, bestMulti, guessCount, guessingOpen, huntBonuses, huntStats } from '@/server/services/hunts';
import { bracket, featuredTournament } from '@/server/services/tournaments';
import { formatUsd } from '@/lib/format';

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Admin overview panel: the running bonus hunt and slot tournament, with the
 * on-stream actions (open/close guessing, enter the next match result) right
 * here instead of on separate pages.
 */
export async function StreamGamesPanel() {
  const [hunt, tournament] = await Promise.all([activeHunt(), featuredTournament()]);
  const [count, rounds] = await Promise.all([hunt ? guessCount(hunt.id) : 0, tournament?.status === 'live' ? bracket(tournament.id) : []]);
  const next = rounds.flatMap((r) => r.matches.map((m) => ({ ...m, roundName: r.name }))).find((m) => !m.winner && m.playerA && m.playerB);

  const s = hunt ? huntStats(hunt) : null;
  const bonuses = hunt ? huntBonuses(hunt) : [];
  const current = hunt ? bonuses.find((b) => b.id === hunt.currentOpeningSlot) : null;
  const phase = !hunt ? null : hunt.isOpening ? 'Opening' : guessingOpen(hunt) ? 'Collecting · guessing open' : 'Collecting · guessing closed';

  return (
    <section className="admin-split">
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>Bonus hunt</strong>
          <Link href="/admin/hunts" style={{ fontSize: 13 }}>
            Manage
          </Link>
        </div>
        {hunt && s ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {hunt.title}
                {hunt.casino ? <span className="meta"> · {hunt.casino}</span> : null}
              </span>
              <span className={hunt.isOpening ? 'tag tag--accent' : 'tag tag--warn'}>{phase}</span>
            </div>
            <div className="hunt-stats">
              <div>
                <span className="meta">Start</span>
                <b className="num">{formatUsd(hunt.startCost)}</b>
              </div>
              <div>
                <span className="meta">Opened</span>
                <b className="num">
                  {s.openedBonuses ?? 0}/{s.bonusCount ?? bonuses.length}
                </b>
              </div>
              <div>
                <span className="meta">Won</span>
                <b className="num">{money2(s.totalWinnings ?? 0)}</b>
              </div>
              <div>
                <span className="meta">Best</span>
                <b className="num">{bestMulti(hunt) ? `${bestMulti(hunt)}×` : '—'}</b>
              </div>
            </div>
            {current ? <span className="meta">Opening now: {current.slotName}</span> : null}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="meta">
                {count} guess{count === 1 ? '' : 'es'}
                {hunt.isOpening ? ' · locked automatically while opening' : ''}
              </span>
              {!hunt.isOpening ? (
                <form action={toggleGuessing}>
                  <input type="hidden" name="huntId" value={hunt.id} />
                  <input type="hidden" name="open" value={hunt.guessesOpen ? '0' : '1'} />
                  <input type="hidden" name="back" value="/admin" />
                  <button className={hunt.guessesOpen ? 'btn btn--secondary' : 'btn btn--primary'} type="submit">
                    {hunt.guessesOpen ? 'Close guessing' : 'Open guessing'}
                  </button>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <p className="meta">No hunt running. Start one on bonushunt.gg — it shows here and in the site nav within 30 seconds.</p>
        )}
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>Slot tournament</strong>
          <Link href={tournament ? `/admin/tournaments/${tournament.id}` : '/admin/tournaments'} style={{ fontSize: 13 }}>
            {tournament ? 'Bracket' : 'Create one'}
          </Link>
        </div>
        {tournament?.status === 'live' ? (
          <>
            <span>{tournament.name}</span>
            {next ? (
              <form action={recordResultAction} className="stack" style={{ gap: 10 }}>
                <span className="meta">
                  Next: {next.roundName} · <b style={{ color: 'var(--color-text)' }}>{next.playerA}</b> ({next.slotA}) vs{' '}
                  <b style={{ color: 'var(--color-text)' }}>{next.playerB}</b> ({next.slotB})
                </span>
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="matchId" value={next.id} />
                <input type="hidden" name="back" value="/admin" />
                <div className="bracket__form" style={{ marginTop: 0 }}>
                  <label className="visually-hidden" htmlFor="dash-a">
                    {next.playerA} multiplier
                  </label>
                  <input id="dash-a" name="multiA" className="input" inputMode="decimal" placeholder={`${next.playerA} ×`} required />
                  <label className="visually-hidden" htmlFor="dash-b">
                    {next.playerB} multiplier
                  </label>
                  <input id="dash-b" name="multiB" className="input" inputMode="decimal" placeholder={`${next.playerB} ×`} required />
                  <button className="btn btn--primary" type="submit">
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <span className="meta">Waiting for players to reach the next round.</span>
            )}
          </>
        ) : (
          <p className="meta">{tournament ? `Last: ${tournament.name} (${tournament.status}).` : 'No tournaments yet.'}</p>
        )}
      </div>
    </section>
  );
}
