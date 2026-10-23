import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/admin/Flash';
import { ResultForm } from '@/components/admin/ResultForm';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { TournamentBracket, TournamentVersus } from '@/components/tournament/Bracket';
import { addEntryAction, removeEntryAction, startTournamentAction, toggleTournamentRequests } from '@/server/actions/hunts';
import { artFor, slotArt } from '@/server/services/slot-art';
import { bracketSize, getEntries, getMatches, getTournament, isPlayable, summarise } from '@/server/services/tournaments';
import { formatAgo } from '@/lib/format';

export const metadata: Metadata = { title: 'Tournament' };

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function TournamentAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTournament(id);
  if (!t) notFound();
  const [entries, matches, art] = await Promise.all([getEntries(id), getMatches(id), slotArt()]);
  const s = summarise(matches);
  const cur = s.current;
  const drawSize = entries.length >= 2 ? bracketSize(Math.min(entries.length, t.size), t.size) : null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/tournaments" className="meta">
          ← Tournaments
        </Link>
        <h1 className="admin__title">{t.name}</h1>
        <p className="admin__sub">
          {t.status === 'signup' ? 'Taking sign-ups' : t.status === 'live' ? 'Live' : 'Finished'} · bracket of {t.size}
          {t.prize ? ` · prize: ${t.prize}` : ''}
          {s.champion ? ` · champion: ${s.champion}` : ''} · <Link href="/tournament">public page</Link>
        </p>
      </div>
      <Flash {...flash} />

      <section className="admin-kpis">
        <div className="kpi">
          <div className="kpi__label">{t.status === 'signup' ? 'Signed up' : 'Still in'}</div>
          <div className="kpi__value">{t.status === 'signup' ? entries.length : s.alive}</div>
          <div className="kpi__note">{t.status === 'signup' ? `${t.size} places` : `of ${entries.length} signed up`}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Buys</div>
          <div className="kpi__value">{s.buys}</div>
          <div className="kpi__note">{money2(s.cost)} spent</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Profit</div>
          <div className={`kpi__value ${s.payout - s.cost >= 0 ? 'kpi__value--accent' : ''}`}>
            {s.payout - s.cost >= 0 ? '+' : '−'}
            {money2(Math.abs(s.payout - s.cost))}
          </div>
          <div className="kpi__note">{money2(s.payout)} paid back</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">!sr</div>
          <div className={`kpi__value ${t.requestsOpen ? 'kpi__value--accent' : ''}`}>{t.requestsOpen ? 'Open' : 'Closed'}</div>
          <form action={toggleTournamentRequests} style={{ marginTop: 6 }}>
            <input type="hidden" name="tournamentId" value={t.id} />
            <input type="hidden" name="open" value={t.requestsOpen ? '0' : '1'} />
            {t.status !== 'finished' ? (
              <button className="btn btn--secondary" type="submit">
                {t.requestsOpen ? 'Close' : 'Open'}
              </button>
            ) : null}
          </form>
        </div>
      </section>

      {t.status === 'signup' ? (
        <>
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Draw the bracket</strong>
              <form action={startTournamentAction}>
                <input type="hidden" name="id" value={t.id} />
                <button className="btn btn--primary" type="submit" disabled={entries.length < 2}>
                  Draw bracket &amp; go live
                </button>
              </form>
            </div>
            <span className="meta">
              {entries.length < 2
                ? 'Needs at least 2 sign-ups.'
                : `Draws ${Math.min(entries.length, t.size)} of ${entries.length} at random into a bracket of ${drawSize}${
                    drawSize && drawSize > Math.min(entries.length, t.size) ? `, with ${drawSize - Math.min(entries.length, t.size)} bye(s)` : ''
                  }. After that, players still in can change slot with !sr before their next match.`}
            </span>
          </section>

          <section className="card">
            <strong>Sign-ups · {entries.length}</strong>
            {entries.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>Nobody yet. Chat signs up with !sr slot name.</p> : null}
            {entries.map((e) => (
              <div key={e.id} className="admin-row">
                <div className="slotcell admin-row__body">
                  <SlotThumb name={e.slot} image={artFor(art, e.slot)} size={36} />
                  <span>
                    <b>{e.kickUsername}</b>
                    <small>
                      {e.slot} · {e.kickUserId ? 'via chat' : 'added by staff'} · {formatAgo(e.updatedAt)}
                    </small>
                  </span>
                </div>
                <form action={removeEntryAction}>
                  <input type="hidden" name="tournamentId" value={t.id} />
                  <input type="hidden" name="entryId" value={e.id} />
                  <button className="btn btn--secondary" type="submit">
                    Remove
                  </button>
                </form>
              </div>
            ))}
            <form action={addEntryAction} className="admin-row">
              <input type="hidden" name="tournamentId" value={t.id} />
              <label className="visually-hidden" htmlFor="add-player">
                Player
              </label>
              <input id="add-player" name="player" className="input" placeholder="Player" style={{ flex: '1 1 160px' }} required />
              <label className="visually-hidden" htmlFor="add-slot">
                Slot
              </label>
              <input id="add-slot" name="slot" className="input" placeholder="Slot" style={{ flex: '1 1 200px' }} required />
              <button className="btn btn--secondary" type="submit">
                Add by hand
              </button>
            </form>
          </section>
        </>
      ) : (
        <>
          {cur && cur.playerA && cur.playerB ? (
            <section className="stack" style={{ gap: 12 }}>
              <TournamentVersus
                match={cur}
                round={cur.roundName}
                a={{ player: cur.playerA, slot: cur.slotA, image: artFor(art, cur.slotA), multi: cur.multiA }}
                b={{ player: cur.playerB, slot: cur.slotB, image: artFor(art, cur.slotB), multi: cur.multiB }}
              />
              <div className="card">
                <strong>Enter the result</strong>
                <ResultForm match={cur} tournamentId={t.id} />
              </div>
            </section>
          ) : null}
          <section className="card" style={{ overflowX: 'auto' }}>
            <TournamentBracket
              s={s}
              renderAction={(m) =>
                t.status === 'live' && isPlayable(m) && m.id !== cur?.id ? (
                  <details className="tb-action">
                    <summary>Enter result</summary>
                    <ResultForm match={m} tournamentId={t.id} />
                  </details>
                ) : null
              }
            />
          </section>
        </>
      )}
    </div>
  );
}
