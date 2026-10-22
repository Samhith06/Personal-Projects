import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { createTournamentAction } from '@/server/actions/hunts';
import { listTournaments } from '@/server/services/tournaments';

export const metadata: Metadata = { title: 'Slot tournaments' };

const TAG: Record<string, string> = { draft: 'tag tag--neutral', live: 'tag tag--accent', finished: 'tag tag--neutral' };

export default async function TournamentsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const rows = await listTournaments();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Slot tournaments</h1>
        <p className="meta">
          Single elimination: each match is two players&apos; slots, highest multiplier goes through. bonushunt.gg&apos;s API has no
          tournaments, so brackets are run here.
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
              <div className="meta">{t.prize ?? 'No prize set'}</div>
            </div>
            <span className={TAG[t.status] ?? 'tag tag--neutral'}>{t.status}</span>
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
          </div>
          <div className="field">
            <label htmlFor="t-entries">Players and their slots, one per line, in seed order</label>
            <textarea
              id="t-entries"
              name="entries"
              className="input"
              rows={8}
              style={{ padding: 12, minHeight: 180 }}
              placeholder={'Kaizo — Gates of Olympus 1000\nlunarbet — Sweet Bonanza 1000\nMavv — Wanted Dead or a Wild\nspinwitch — Le Bandit'}
              required
            />
            <span className="meta">2–64 players. Uneven fields get byes for the top seeds.</span>
          </div>
          <div>
            <button className="btn btn--primary" type="submit">
              Create bracket
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
