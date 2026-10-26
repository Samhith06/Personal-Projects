import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { CopyLink } from '@/components/admin/CopyLink';
import {
  DeleteTourneyButton,
  MarkTourneyPaidButton,
  RemoveSignupButton,
  SignupSwitches,
  StartTourneyForm,
  TourneyResultForm,
  TourneySwitches,
} from '@/components/admin/TourneyControls';
import { SlotArt } from '@/components/stream-games/SlotArt';
import { TourneyBracket, TourneyVersus } from '@/components/stream-games/TourneyBracket';
import { roundName, scoreOf, x } from '@/lib/tourney';
import { featuredTourney, summariseTourney, tourneyEntriesFor, tourneyMatchesFor, tourneyTurnsFor } from '@/server/services/tourney';
import { dateTime, money } from '@/lib/format';
import { siteUrl } from '@/lib/env';

export const metadata: Metadata = { title: 'Slot tournament' };

/** The slot tournament, run from here (ported from MattySpins' /admin/tournament). */
export default async function AdminTourneyPage() {
  const t = await featuredTourney();
  const [entries, matches, turns] = t ? await Promise.all([tourneyEntriesFor(t.id), tourneyMatchesFor(t.id), tourneyTurnsFor(t.id)]) : [[], [], []];
  const s = t ? summariseTourney(t, entries, matches, turns) : null;
  const live = t != null && t.status !== 'finished';
  const last = turns[turns.length - 1];
  const nextSide = s?.current?.state.next ?? null;
  const nextPlayer = s?.current && nextSide ? s.current[nextSide] : null;
  const roundLabel = s?.current ? roundName(s.current.round, s.rounds) : null;
  const champEntry = s?.champion ? entries.find((e) => e.id === s.champion?.entryId) : undefined;
  const crowned = t?.status === 'finished' && t.startedAt != null && s?.champion != null;
  const unpaid = crowned && t.prize && champEntry?.linked && !t.prizePaidAt;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Sign-ups fill from chat on their own; keep it current without a reload. */}
      {live ? <AutoRefresh seconds={5} /> : null}
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Slot tournament</h1>
        <p className="admin__sub">
          Chat signs up with <b>!sr &lt;slot&gt;</b> — while a tournament is live, !sr goes here instead of the <Link href="/admin/hunt">hunt</Link>. The
          public page is <Link href="/tournament">/tournament</Link>.
        </p>
      </div>

      {!live ? <StartTourneyForm /> : null}

      <OverlayLinks />

      {!t || !s ? (
        <div className="emptyq">No tournament yet.</div>
      ) : (
        <>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="hunt-tags" style={{ alignItems: 'center' }}>
              <strong className="hunt-h" style={{ marginRight: 4 }}>
                {t.title}
              </strong>
              <span className={`tag ${live ? 'tag--accent' : 'tag--neutral'}`}>
                {t.status === 'signup' ? 'Sign-ups' : t.status === 'running' ? (s.champion ? 'Final decided' : 'Playing') : 'Finished'}
              </span>
              <span className="tag tag--neutral">{t.size}-player bracket</span>
              {live ? <span className="tag tag--neutral">{t.requestsOpen ? '!sr open' : '!sr closed'}</span> : null}
              {t.prize ? <span className="tag tag--warn">{t.prize} to the champion</span> : null}
            </div>

            {t.status === 'running' && s.champion ? <p className="champ-banner">♜ {s.champion.kickUsername} wins the final. End the tournament to crown them.</p> : null}

            {t.status === 'signup' ? (
              <SignupSwitches gameId={t.id} requestsOpen={t.requestsOpen} signups={entries.length} size={t.size} />
            ) : t.status === 'running' ? (
              <TourneySwitches
                gameId={t.id}
                requestsOpen={t.requestsOpen}
                nextLabel={nextPlayer ? `${nextPlayer.kickUsername}'s buy (${roundLabel})` : null}
                inPlay={s.playing != null}
                decided={s.champion != null}
                canUndo={last != null && last.status === 'played'}
                current={s.current?.a && s.current.b ? { a: s.current.a.kickUsername, b: s.current.b.kickUsername } : null}
              />
            ) : (
              <p>
                {!crowned ? (
                  <span className="meta">Ended before the final was decided, so there is no champion.</span>
                ) : !t.prize ? (
                  <>Champion: {s.champion!.kickUsername}.</>
                ) : t.prizePaidAt ? (
                  <>
                    Paid <b style={{ color: 'var(--medal-gold)' }}>{t.prize}</b> to champion {s.champion!.kickUsername}.
                  </>
                ) : champEntry?.linked ? (
                  <>
                    Champion {s.champion!.kickUsername} is owed <b style={{ color: 'var(--medal-gold)' }}>{t.prize}</b>.
                  </>
                ) : (
                  <span className="meta">{s.champion!.kickUsername}&apos;s Kick account isn&apos;t linked, so the prize can&apos;t be paid.</span>
                )}
              </p>
            )}

            {/* A tournament that paid its champion is the record of that
                payment, so it has no delete button (the service refuses it too). */}
            {t.prizePaidAt ? null : (
              <div className="hunt-danger">
                {unpaid ? <MarkTourneyPaidButton gameId={t.id} label={`Mark ${t.prize} paid`} /> : null}
                <DeleteTourneyButton gameId={t.id} title={t.title} />
              </div>
            )}
          </section>

          {t.status === 'signup' ? (
            <section className="stack" style={{ gap: 10 }}>
              <strong className="hunt-h">
                Signed up <span className="meta">({entries.length} for {t.size} places)</span>
              </strong>
              {entries.length === 0 ? (
                <div className="emptyq">{t.requestsOpen ? 'Nobody has typed !sr yet.' : 'Empty.'}</div>
              ) : (
                <div className="card" style={{ padding: '4px 18px' }}>
                  {entries.map((e) => (
                    <div className="admin-row" key={e.id}>
                      <div className="slotcell admin-row__body">
                        <SlotArt src={e.imageUrl} name={e.slotName ?? e.query} />
                        <span>
                          <b>{e.kickUsername}</b>
                          <small>
                            {e.slotName ?? `“${e.query}” (not in catalog)`}
                            {e.linked ? '' : ' · not linked'}
                          </small>
                        </span>
                      </div>
                      <RemoveSignupButton entryId={e.id} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              <div className="admin-kpis">
                <Kpi label="Players" value={String(entries.filter((e) => e.seeded).length)} note={`${s.alive.size} still in`} tone="accent" />
                <Kpi label="Buys" value={String(s.bought)} note={`${money(s.cost)} spent`} />
                <Kpi label="Paid back" value={money(s.won)} tone="gold" />
                <Kpi label="Profit" value={money(s.profit)} tone={s.profit >= 0 ? 'accent' : 'warn'} />
              </div>

              {t.status === 'running' && s.current ? (
                <div className="tourney-admin">
                  <div style={{ minWidth: 0 }}>
                    <TourneyVersus s={s} round={roundLabel ?? undefined} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {s.playing ? (
                      <div className="card stack" style={{ gap: 10 }}>
                        <span className="kicker">Now playing · {roundLabel}</span>
                        <div className="slotcell">
                          <SlotArt src={s.playing.imageUrl} name={s.playing.slotName} />
                          <span>
                            <b style={{ fontSize: 16 }}>{s.playing.slotName}</b>
                            <small>
                              {s.playing.provider ? `${s.playing.provider} · ` : ''}for {s.playing.kickUsername}
                            </small>
                          </span>
                        </div>
                        <TourneyResultForm key={s.playing.id} turnId={s.playing.id} />
                        <p className="meta">The higher multiplier goes through; level means both buy again.</p>
                      </div>
                    ) : (
                      <div className="card">
                        <p className="meta" style={{ margin: 0 }}>
                          Press <b>Start</b> for the next buy. Players still in can !sr a new slot before their turn.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="card" style={{ overflowX: 'auto' }}>
                <TourneyBracket s={s} />
              </div>

              <section className="stack" style={{ gap: 10 }}>
                <strong className="hunt-h">
                  Buys <span className="meta">({turns.length})</span>
                </strong>
                {turns.length === 0 ? (
                  <div className="emptyq">No buys yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="table" style={{ minWidth: 700 }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Round</th>
                          <th>Viewer · slot</th>
                          <th style={{ textAlign: 'right' }}>Cost</th>
                          <th style={{ textAlign: 'right' }}>Paid</th>
                          <th style={{ textAlign: 'right' }}>Score</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turns
                          .map((u, i) => [u, i + 1] as const)
                          .reverse()
                          .map(([u, n]) => {
                            const m = matches.find((mm) => mm.id === u.matchId);
                            const sc = scoreOf(u);
                            return (
                              <tr key={u.id}>
                                <td className="meta num">{n}</td>
                                <td className="meta">{m ? roundName(m.round, s.rounds) : '—'}</td>
                                <td>
                                  <div className="slotcell">
                                    <SlotArt src={u.imageUrl} name={u.slotName} />
                                    <span>
                                      <b>{u.kickUsername}</b>
                                      <small>{u.slotName}</small>
                                    </span>
                                  </div>
                                </td>
                                <td className="num" style={{ textAlign: 'right' }}>
                                  {u.buyCost == null ? '—' : money(u.buyCost)}
                                </td>
                                <td className="num" style={{ textAlign: 'right' }}>
                                  {u.payout == null ? '—' : money(u.payout)}
                                </td>
                                <td className="num" style={{ textAlign: 'right' }}>
                                  {u.status === 'playing' ? (
                                    <span className="tag tag--accent">In play</span>
                                  ) : u.status === 'skipped' ? (
                                    <span className="tag tag--neutral">Skipped</span>
                                  ) : sc == null ? (
                                    '—'
                                  ) : (
                                    x(sc)
                                  )}
                                </td>
                                <td className="meta">{dateTime(u.drawnAt)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="meta" style={{ maxWidth: '72ch' }}>
                  The champion is crowned when the tournament ends, and only a champion whose Kick account is linked can be paid; until then a
                  mistyped result can be undone — even one that decided a match. A player who can&apos;t be played can be forfeited, and their
                  opponent goes through.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

const OVERLAYS: Array<[string, string, string]> = [
  ['Everything', '', '1100 × 760'],
  ['Bracket', '?panel=bracket', '1100 × 520 (16 players: 1280 × 720)'],
  ['Match (head to head)', '?panel=match', '620 × 200'],
  ['Stats strip', '?panel=stats', '520 × 90'],
];

/** The URLs to paste into OBS, collapsed because they're set up once. */
function OverlayLinks() {
  return (
    <details className="card hunt-fold">
      <summary>OBS overlays</summary>
      <p className="meta" style={{ margin: '10px 0 12px' }}>
        Add each as a <b>Browser</b> source in OBS at the size shown (it can be resized after). The background is transparent, it updates
        itself every few seconds, and it shows nothing before the first tournament. During sign-ups the match panel shows how to enter.
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {OVERLAYS.map(([label, query, size]) => (
          <div key={label} className="overlay-link">
            <b>{label}</b>
            <span className="meta">{size}</span>
            <CopyLink value={siteUrl(`/overlay/tournament${query}`)} />
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
