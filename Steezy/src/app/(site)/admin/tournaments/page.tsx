import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { createTournamentAction } from '@/server/actions/hunts';
import { TOURNAMENT_SIZES, listTournaments } from '@/server/services/tournaments';

export const metadata: Metadata = { title: 'Slot tournaments' };

const TAG: Record<string, string> = { signup: 'tag tag--warn', live: 'tag tag--accent', finished: 'tag tag--neutral' };
const LABEL: Record<string, string> = { signup: 'sign-ups', live: 'live', finished: 'finished' };

export default async function TournamentsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const rows = await listTournaments();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Slot tournaments</h1>
        <p className="admin__sub">
          Create one and chat signs up with <code>!sr slot name</code>. When you go live, draw the bracket: it picks players at random
          from the sign-ups. Each match is one buy each; enter what each buy cost and paid and the higher multiplier goes through.
        </p>
      </div>
      <Flash {...flash} />

      <section className="card">
        {rows.length === 0 ? <p className="meta">No tournaments yet.</p> : null}
        {rows.map((t) => (
          <div key={t.id} className="admin-row">
            <div className="admin-row__body">
              <Link href={`/admin/tournaments/${t.id}`} style={{ fontWeight: 500 }}>
                {t.name}
              </Link>
              <div className="meta">
                Bracket of {t.size} · {t.prize ?? 'no prize set'}
              </div>
            </div>
            <span className={TAG[t.status] ?? 'tag tag--neutral'}>{LABEL[t.status] ?? t.status}</span>
          </div>
        ))}
      </section>

      <section className="card stack">
        <strong>New tournament</strong>
        <form action={createTournamentAction} className="stack" style={{ gap: 14 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="t-name">Name</label>
              <input id="t-name" name="name" className="input" placeholder="Friday slot battle" required />
            </div>
            <div className="field">
              <label htmlFor="t-prize">Prize (optional)</label>
              <input id="t-prize" name="prize" className="input" placeholder="$250 Roobet tip" />
            </div>
            <div className="field">
              <label htmlFor="t-size">Bracket size</label>
              <select id="t-size" name="size" className="input" defaultValue="8">
                {TOURNAMENT_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} players
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button className="btn btn--primary" type="submit">
              Create and open sign-ups
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
