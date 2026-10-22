import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/admin/Flash';
import { Bracket } from '@/components/hunts/Bracket';
import { recordResultAction, startTournamentAction } from '@/server/actions/hunts';
import { bracket, getTournament, matchWinnerName } from '@/server/services/tournaments';

export const metadata: Metadata = { title: 'Tournament' };

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
  const rounds = await bracket(id);
  const final = rounds.at(-1)?.matches[0];
  const champion = final ? matchWinnerName(final) : null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/tournaments" className="meta">
          ← Tournaments
        </Link>
        <h1 className="admin__title">{t.name}</h1>
        <p className="meta">
          Status: {t.status}
          {t.prize ? ` · prize: ${t.prize}` : ''}
          {champion ? ` · champion: ${champion}` : ''}
        </p>
      </div>
      <Flash {...flash} />

      {t.status === 'draft' ? (
        <section className="card row" style={{ justifyContent: 'space-between' }}>
          <span className="meta">Starting shows the bracket on /hunts and sends any byes straight through.</span>
          <form action={startTournamentAction}>
            <input type="hidden" name="id" value={t.id} />
            <button className="btn btn--primary" type="submit">
              Start tournament
            </button>
          </form>
        </section>
      ) : null}

      <section className="card" style={{ overflowX: 'auto' }}>
        <Bracket
          rounds={rounds}
          renderAction={(m) =>
            t.status === 'live' && !m.winner && m.playerA && m.playerB ? (
              <form action={recordResultAction} className="bracket__form">
                <input type="hidden" name="tournamentId" value={t.id} />
                <input type="hidden" name="matchId" value={m.id} />
                <label className="visually-hidden" htmlFor={`a-${m.id}`}>
                  {m.playerA} multiplier
                </label>
                <input id={`a-${m.id}`} name="multiA" className="input" inputMode="decimal" placeholder="A ×" required />
                <label className="visually-hidden" htmlFor={`b-${m.id}`}>
                  {m.playerB} multiplier
                </label>
                <input id={`b-${m.id}`} name="multiB" className="input" inputMode="decimal" placeholder="B ×" required />
                <button className="btn btn--primary" type="submit">
                  Save
                </button>
              </form>
            ) : null
          }
        />
      </section>
    </div>
  );
}
