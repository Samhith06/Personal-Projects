import Link from 'next/link';
import { HuntSwitches } from '@/components/admin/HuntControls';
import { TourneySwitches } from '@/components/admin/TourneyControls';
import { roundName } from '@/lib/tourney';
import { money, mult } from '@/lib/format';
import { bonusesFor, guessesFor, huntStats, liveHunt, requestsFor } from '@/server/services/hunts';
import { liveTourney, summariseTourney, tourneyEntriesFor, tourneyMatchesFor, tourneyTurnsFor } from '@/server/services/tourney';

const PHASE = { collecting: 'Collecting', opening: 'Opening', finished: 'Finished' } as const;

/**
 * Admin overview panel: the running bonus hunt and slot tournament, with the
 * same switches as their own screens so the common moves are one click away.
 */
export async function StreamGamesPanel() {
  const [hunt, tourney] = await Promise.all([liveHunt(), liveTourney()]);
  const [bonuses, requests, guesses, entries, matches, turns] = await Promise.all([
    hunt ? bonusesFor(hunt.id) : [],
    hunt ? requestsFor(hunt.id, 'pending') : [],
    hunt ? guessesFor(hunt.id) : [],
    tourney ? tourneyEntriesFor(tourney.id) : [],
    tourney ? tourneyMatchesFor(tourney.id) : [],
    tourney ? tourneyTurnsFor(tourney.id) : [],
  ]);
  const stats = hunt ? huntStats(hunt, bonuses) : null;
  const current = hunt?.status === 'opening' ? bonuses.find((b) => b.payout == null) : undefined;
  const s = tourney ? summariseTourney(tourney, entries, matches, turns) : null;
  const nextSide = s?.current?.state.next ?? null;
  const nextPlayer = s?.current && nextSide ? s.current[nextSide] : null;
  const last = turns[turns.length - 1];

  return (
    <section className="admin-split">
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>Bonus hunt</strong>
          <Link href="/admin/hunt" style={{ fontSize: 13 }}>
            {hunt ? 'Manage' : 'Start one'}
          </Link>
        </div>
        {hunt && stats ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>{hunt.title}</span>
              <span className={hunt.status === 'opening' ? 'tag tag--accent' : 'tag tag--warn'}>{PHASE[hunt.status]}</span>
            </div>
            <div className="hunt-stats">
              <div>
                <span className="meta">Start</span>
                <b className="num">{money(hunt.startCost)}</b>
              </div>
              <div>
                <span className="meta">Opened</span>
                <b className="num">
                  {stats.opened}/{stats.bonuses}
                </b>
              </div>
              <div>
                <span className="meta">Won</span>
                <b className="num">{money(stats.won)}</b>
              </div>
              <div>
                <span className="meta">Best</span>
                <b className="num">{stats.best?.payout != null ? mult(stats.best.payout / stats.best.bet) : '—'}</b>
              </div>
            </div>
            {current ? <span className="meta">Opening now: {current.slotName}</span> : null}
            <Link href="/admin/hunt" className="meta">
              {requests.length} slot request{requests.length === 1 ? '' : 's'} waiting · {guesses.length} guess{guesses.length === 1 ? '' : 'es'}
            </Link>
            <HuntSwitches
              huntId={hunt.id}
              status={hunt.status}
              requestsOpen={hunt.requestsOpen}
              gtbStatus={hunt.gtbStatus}
              gtbPrize={hunt.gtbPrize}
              unopened={stats.bonuses - stats.opened}
            />
          </>
        ) : (
          <p className="meta">No hunt running.</p>
        )}
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>Slot tournament</strong>
          <Link href="/admin/tournament" style={{ fontSize: 13 }}>
            {tourney ? 'Bracket' : 'Open one'}
          </Link>
        </div>
        {tourney && s ? (
          tourney.status === 'signup' ? (
            <>
              <span>{tourney.title}</span>
              <span className="meta">
                {entries.length} signed up for {tourney.size} places · !sr {tourney.requestsOpen ? 'open' : 'closed'}
              </span>
              <Link className="btn btn--primary" href="/admin/tournament" style={{ alignSelf: 'flex-start' }}>
                Review sign-ups &amp; seed
              </Link>
            </>
          ) : (
            <>
              <span>{tourney.title}</span>
              {s.current?.a && s.current.b ? (
                <span className="meta">
                  {roundName(s.current.round, s.rounds)}: <b style={{ color: 'var(--color-text)' }}>{s.current.a.kickUsername}</b> vs{' '}
                  <b style={{ color: 'var(--color-text)' }}>{s.current.b.kickUsername}</b>
                  {s.playing ? ` · ${s.playing.kickUsername} is buying ${s.playing.slotName}` : ''}
                </span>
              ) : s.champion ? (
                <span className="meta">{s.champion.kickUsername} won the final.</span>
              ) : null}
              <TourneySwitches
                gameId={tourney.id}
                requestsOpen={tourney.requestsOpen}
                nextLabel={nextPlayer && s.current ? `${nextPlayer.kickUsername}'s buy (${roundName(s.current.round, s.rounds)})` : null}
                inPlay={s.playing != null}
                decided={s.champion != null}
                canUndo={last != null && last.status === 'played'}
                current={null}
              />
              {s.playing ? (
                <Link href="/admin/tournament" className="meta">
                  Record the result on the tournament screen →
                </Link>
              ) : null}
            </>
          )
        ) : (
          <p className="meta">No tournament running.</p>
        )}
      </div>
    </section>
  );
}
