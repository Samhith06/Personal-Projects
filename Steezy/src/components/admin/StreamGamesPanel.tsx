import Link from 'next/link';
import { ResultForm } from './ResultForm';
import { toggleGuessing, toggleHuntRequests } from '@/server/actions/hunts';
import { requestsFor } from '@/server/services/hunt-requests';
import { activeHunt, bestMulti, guessCount, guessingOpen, huntBonuses, huntStats } from '@/server/services/hunts';
import { featuredTournament, getEntries, getMatches, summarise } from '@/server/services/tournaments';
import { formatUsd } from '@/lib/format';

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Admin overview panel: the running bonus hunt and slot tournament, with the
 * on-stream actions (open/close guessing, enter the next match result) right
 * here instead of on separate pages.
 */
export async function StreamGamesPanel() {
  const [hunt, tournament] = await Promise.all([activeHunt(), featuredTournament()]);
  const [count, matches, entries, pending] = await Promise.all([
    hunt ? guessCount(hunt.id) : 0,
    tournament ? getMatches(tournament.id) : [],
    tournament ? getEntries(tournament.id) : [],
    hunt ? requestsFor(hunt.id) : [],
  ]);
  const next = summarise(matches).current;

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
              <Link href="/admin/hunts" className="meta">
                {pending.length} slot request{pending.length === 1 ? '' : 's'} waiting
              </Link>
              {!hunt.isOpening ? (
                <form action={toggleHuntRequests}>
                  <input type="hidden" name="huntId" value={hunt.id} />
                  <input type="hidden" name="open" value={hunt.requestsOpen ? '0' : '1'} />
                  <input type="hidden" name="back" value="/admin" />
                  <button className="btn btn--secondary" type="submit">
                    {hunt.requestsOpen ? 'Close !sr' : 'Open !sr'}
                  </button>
                </form>
              ) : null}
            </div>
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
              <div className="stack" style={{ gap: 8 }}>
                <span className="meta">
                  Next: {next.roundName} · <b style={{ color: 'var(--color-text)' }}>{next.playerA}</b> ({next.slotA}) vs{' '}
                  <b style={{ color: 'var(--color-text)' }}>{next.playerB}</b> ({next.slotB})
                </span>
                <ResultForm match={next} tournamentId={tournament.id} back="/admin" />
              </div>
            ) : (
              <span className="meta">Waiting for players to reach the next round.</span>
            )}
          </>
        ) : tournament?.status === 'signup' ? (
          <>
            <span>{tournament.name}</span>
            <span className="meta">
              {entries.length} signed up for {tournament.size} places · !sr {tournament.requestsOpen ? 'open' : 'closed'}
            </span>
            <Link className="btn btn--primary" href={`/admin/tournaments/${tournament.id}`} style={{ alignSelf: 'flex-start' }}>
              Review sign-ups &amp; draw
            </Link>
          </>
        ) : (
          <p className="meta">{tournament ? `Last: ${tournament.name} (finished).` : 'No tournaments yet.'}</p>
        )}
      </div>
    </section>
  );
}
