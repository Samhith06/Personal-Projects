import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { TournamentBracket, TournamentVersus } from '@/components/tournament/Bracket';
import { artFor, slotArt } from '@/server/services/slot-art';
import { featuredTournament, finishedTournaments, getEntries, getMatches, summarise } from '@/server/services/tournaments';

export const metadata: Metadata = {
  title: 'Slot tournament',
  description: 'Slot tournaments on stream: sign up with !sr, get drawn into the bracket, and beat your opponent’s multiplier head to head.',
};

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function TournamentPage() {
  const [t, history, art] = await Promise.all([featuredTournament(), finishedTournaments(8), slotArt()]);
  const [entries, matches] = t ? await Promise.all([getEntries(t.id), getMatches(t.id)]) : [[], []];
  const s = summarise(matches);
  const live = t?.status === 'signup' || t?.status === 'live';
  const past = history.filter((h) => h.id !== t?.id);
  const cur = s.current;

  const eyebrow = !t ? 'Slot tournament' : t.status === 'signup' ? 'Sign-ups open' : t.status === 'live' ? 'Live now' : 'Champion crowned';

  return (
    <div className="container page" style={{ gap: 28 }}>
      {live ? <AutoRefresh seconds={8} /> : null}

      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">
          {t?.status === 'live' ? <span className="dot dot--live" aria-hidden="true" /> : null}
          {eyebrow}
        </span>
        <h1 className="page__title">{t?.name ?? 'Slot tournament'}</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '62ch' }}>
          {live
            ? 'Live from stream — this page updates itself.'
            : t
              ? `${s.champion ? `Won by ${s.champion}` : 'Ended'}${t.finishedAt ? ` ${shortDate(t.finishedAt)}` : ''}. The next tournament starts on stream.`
              : 'No tournament has run yet. The next one starts on stream.'}{' '}
          See also the <Link href="/hunts">bonus hunt</Link>.
        </p>
      </div>

      {t ? (
        <>
          {s.champion ? (
            <p className="champ-banner">
              ♛ {s.champion} is champion{s.runnerUp ? `, beating ${s.runnerUp} in the final` : ''}
              {t.prize ? ` · wins ${t.prize}` : ''}
            </p>
          ) : null}

          <section className="tourney-page">
            <div className="stack" style={{ gap: 14, minWidth: 0 }}>
              {t.status === 'signup' ? (
                <div className="card stack" style={{ gap: 10 }}>
                  <h3 style={{ fontSize: 16 }}>
                    Signed up <span className="meta">({entries.length} for {t.size} places)</span>
                  </h3>
                  {entries.length === 0 ? (
                    <p className="meta">Nobody yet — be first.</p>
                  ) : (
                    <div className="reqgrid">
                      {entries.map((e) => (
                        <div key={e.id} className="slotcell reqcard">
                          <SlotThumb name={e.slot} image={artFor(art, e.slot)} size={40} />
                          <span>
                            <b>{e.kickUsername}</b>
                            <small>{e.slot}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {cur && cur.playerA && cur.playerB ? (
                    <TournamentVersus
                      match={cur}
                      round={cur.roundName}
                      a={{ player: cur.playerA, slot: cur.slotA, image: artFor(art, cur.slotA), multi: cur.multiA }}
                      b={{ player: cur.playerB, slot: cur.slotB, image: artFor(art, cur.slotB), multi: cur.multiB }}
                    />
                  ) : null}
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <TournamentBracket s={s} />
                  </div>
                </>
              )}
            </div>

            <div className="card stack" style={{ gap: 10, alignSelf: 'start' }}>
              <div className="hj-head">
                <span className={`tag ${live && t.requestsOpen ? 'tag--accent' : 'tag--neutral'}`}>
                  {t.status === 'signup' && t.requestsOpen ? 'Sign-ups open' : live && t.requestsOpen ? 'Slot changes open' : 'Closed'}
                </span>
                <h3>How to play</h3>
              </div>
              <p className="meta">
                Type <code>!sr slot name</code> in Kick chat while sign-ups are open. The bracket of {t.size} is drawn at random from
                everyone who signed up. Each match is one bonus buy for each player, and the higher multiplier goes through; if it&apos;s
                level, you both buy again. Still in? <code>!sr</code> a new slot before your next match. The winner of the final is champion
                {t.prize ? (
                  <>
                    {' '}
                    and wins <b style={{ color: 'var(--medal-gold)' }}>{t.prize}</b>
                  </>
                ) : null}
                .
              </p>
              {t.status !== 'signup' ? (
                <span className="meta">
                  <b style={{ color: 'var(--color-text)' }}>{s.alive}</b> still in · <b style={{ color: 'var(--color-text)' }}>{s.buys}</b> buy
                  {s.buys === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <div className="emptyq">Nothing to show yet.</div>
      )}

      {past.length ? (
        <section className="stack" style={{ gap: 12 }}>
          <div>
            <span className="kicker">History</span>
            <h2 className="sec-title">Past champions</h2>
          </div>
          <div className="card" style={{ padding: '6px 12px' }}>
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 620 }}>
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
                  {past.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td className="meta">{h.finishedAt ? shortDate(h.finishedAt) : '—'}</td>
                      <td>{h.champion ? <b style={{ color: 'var(--medal-gold)' }}>{h.champion}</b> : <span className="meta">—</span>}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.players}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {h.buys}
                      </td>
                      <td className="num" style={{ textAlign: 'right', color: h.profit >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {h.buys ? `${h.profit >= 0 ? '+' : '−'}${money2(Math.abs(h.profit))}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
