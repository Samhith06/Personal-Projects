import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SlotArt } from '@/components/stream-games/SlotArt';
import { TourneyBracket, TourneyVersus } from '@/components/stream-games/TourneyBracket';
import { roundName } from '@/lib/tourney';
import { featuredTourney, finishedTourneys, summariseTourney, tourneyEntriesFor, tourneyMatchesFor, tourneyTurnsFor } from '@/server/services/tourney';
import { dateShort, money } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Slot Tournament',
  description:
    'Slot tournaments on SteezySpins: sign up with !sr, get drawn into the bracket, and beat your opponent’s multiplier head to head. The champion wins the prize.',
};

/** The slot tournament (ported from MattySpins' /tournament). */
export default async function TourneyPage() {
  const [t, history] = await Promise.all([featuredTourney(), finishedTourneys(8)]);
  const [entries, matches, turns] = t ? await Promise.all([tourneyEntriesFor(t.id), tourneyMatchesFor(t.id), tourneyTurnsFor(t.id)]) : [[], [], []];
  const s = t ? summariseTourney(t, entries, matches, turns) : null;
  const live = t != null && t.status !== 'finished';
  const past = history.filter((h) => h.id !== t?.id);

  return (
    <div className="container page" style={{ gap: 28 }}>
      {live ? <AutoRefresh seconds={8} /> : null}

      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">
          {t?.status === 'running' && !s?.champion ? <span className="dot dot--live" aria-hidden="true" /> : null}
          {t?.status === 'signup' ? 'Sign-ups open' : live ? (s?.champion ? 'Champion!' : 'Live now') : 'Slot tournament'}
        </span>
        <h1 className="page__title">{t?.title ?? 'Slot Tournament'}</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '62ch' }}>
          {live
            ? 'Live from stream. This page updates itself.'
            : t
              ? `${s?.champion ? `Won by ${s.champion.kickUsername}` : 'Ended'} ${t.finishedAt ? dateShort(t.finishedAt) : ''}. The next tournament starts on stream.`
              : 'No tournament has run yet. The next one starts on stream.'}{' '}
          See also the <Link href="/hunt">bonus hunt</Link>.
        </p>
      </div>

      {t && s ? (
        <>
          {s.champion ? (
            <p className="champ-banner">
              ♜ {s.champion.kickUsername} is champion
              {s.runnerUp ? `, beating ${s.runnerUp.kickUsername} in the final` : ''}
              {t.prizePaidAt && t.prize ? ` · won ${t.prize}` : ''}
            </p>
          ) : null}

          <div className="tourney-page">
            <div className="stack" style={{ gap: 14, minWidth: 0 }}>
              {t.status === 'signup' ? (
                <div className="card stack" style={{ gap: 10 }}>
                  <h3 className="hunt-h">
                    Signed up <span className="meta">({entries.length} for {t.size} places)</span>
                  </h3>
                  {entries.length === 0 ? (
                    <p className="meta">Nobody yet — be first.</p>
                  ) : (
                    entries.map((e) => (
                      <div key={e.id} className="slotcell signup-row">
                        <SlotArt src={e.imageUrl} name={e.slotName ?? e.query} />
                        <span>
                          <b>{e.kickUsername}</b>
                          <small>{e.slotName ?? e.query}</small>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {s.current ? <TourneyVersus s={s} round={roundName(s.current.round, s.rounds)} /> : null}
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <TourneyBracket s={s} />
                  </div>
                </>
              )}
            </div>

            <div className="card stack" style={{ gap: 10, minWidth: 0 }}>
              <div className="hj-head">
                <span className={`tag ${live && t.requestsOpen ? 'tag--accent' : 'tag--neutral'}`}>
                  {t.status === 'signup' && t.requestsOpen ? 'Sign-ups open' : live && t.requestsOpen ? 'Open' : 'Closed'}
                </span>
                <h3>How to play</h3>
              </div>
              <p className="meta">
                Type <code>!sr slot name</code> in Kick chat while sign-ups are open. The bracket of {t.size} is drawn at random from everyone who
                signed up. Each match is one bonus buy for each player, and the higher multiplier goes through; if it&apos;s level, you both buy
                again. Still in? You can <code>!sr</code> a new slot before your next match. The winner of the final is champion
                {t.prize ? (
                  <>
                    {' '}
                    and wins <b style={{ color: 'var(--medal-gold)' }}>{t.prize}</b>
                  </>
                ) : null}
                . To be paid, your Kick account has to be <Link href="/me/link">linked</Link>.
              </p>
              {t.status !== 'signup' ? (
                <p style={{ fontSize: 14 }}>
                  <b>{s.alive.size}</b> still in · <b>{s.bought}</b> buy{s.bought === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="emptyq">Nothing to show yet.</div>
      )}

      {past.length > 0 ? (
        <section className="stack" style={{ gap: 12 }}>
          <div>
            <span className="kicker">History</span>
            <h2 className="sec-title">Past champions</h2>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Date</th>
                  <th>Champion</th>
                  <th style={{ textAlign: 'right' }}>Players</th>
                  <th style={{ textAlign: 'right' }}>Buys</th>
                  <th style={{ textAlign: 'right' }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {past.map((h) => {
                  const profit = h.won - h.cost;
                  return (
                    <tr key={h.id}>
                      <td>{h.title}</td>
                      <td className="meta">{h.finishedAt ? dateShort(h.finishedAt) : '—'}</td>
                      <td>{h.champion ? <b>{h.champion}</b> : <span className="meta">Not finished</span>}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.players}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.bought}
                      </td>
                      <td className="num" style={{ textAlign: 'right', color: profit >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {profit >= 0 ? '+' : ''}
                        {money(profit)}
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
