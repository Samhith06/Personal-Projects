import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { RaffleForm } from '@/components/admin/DrawForms';
import { listRaffles } from '@/server/services/raffles';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Raffles' };

const TAG: Record<string, string> = { draft: 'tag tag--neutral', open: 'tag tag--accent', closed: 'tag tag--warn', drawn: 'tag tag--neutral' };

export default async function RafflesAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const rows = await listRaffles();
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Moderation</span>
        <h1 className="admin__title">Raffles</h1>
        <p className="meta">Draft → open (seed fingerprint published) → closed (tickets frozen, automatic at the end date) → drawn live on stream.</p>
      </div>
      <Flash {...flash} />
      <section className="card">
        {rows.length === 0 ? <p className="meta">No raffles yet.</p> : null}
        {rows.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="admin-row__body">
              <Link href={`/admin/raffles/${r.id}`} style={{ fontWeight: 500 }}>
                {r.name}
              </Link>
              <div className="meta">
                {fmt(r.startsAt)} – {fmt(r.endsAt)} · {formatUsd(r.usdPerTicket)}/ticket · {formatUsd(r.prizes.reduce((a, b) => a + b, 0))} in prizes
              </div>
            </div>
            <span className={TAG[r.status] ?? 'tag tag--neutral'}>{r.status}</span>
          </div>
        ))}
      </section>
      <section className="card stack">
        <strong>New raffle</strong>
        <RaffleForm />
      </section>
    </div>
  );
}
