import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/admin/Flash';
import { RaffleForm } from '@/components/admin/DrawForms';
import { markRafflePrizePaid, raffleStep } from '@/server/actions/draws';
import { getRaffle, getRaffleWinners, getTickets } from '@/server/services/raffles';
import { siteUrl } from '@/lib/env';
import { formatUsd, ordinal } from '@/lib/format';

export const metadata: Metadata = { title: 'Raffle' };

const NEXT: Record<string, { step: string; label: string; note: string }> = {
  draft: { step: 'open', label: 'Open raffle', note: 'Publishes the seed fingerprint. The rules can’t be edited after this.' },
  open: { step: 'close', label: 'Close now', note: 'Freezes ticket counts. Happens automatically at the end date.' },
  closed: { step: 'draw', label: 'Draw winners', note: 'Do this live: the overlay animates the draw and reveals the seed.' },
};

export default async function RaffleAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const flash = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const raffle = await getRaffle(id);
  if (!raffle) notFound();
  const [tickets, winners] = await Promise.all([getTickets(raffle), getRaffleWinners(id)]);
  const next = NEXT[raffle.status];
  const total = tickets.reduce((s, t) => s + t.tickets, 0);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/raffles" className="meta">
          ← Raffles
        </Link>
        <h1 className="admin__title">{raffle.name}</h1>
        <p className="meta">
          Status: {raffle.status} · {total.toLocaleString('en-US')} tickets · {tickets.length} players
        </p>
      </div>
      <Flash {...flash} />

      {next ? (
        <section className="card row" style={{ justifyContent: 'space-between' }}>
          <span className="meta" style={{ flex: '1 1 300px' }}>
            {next.note}
          </span>
          <form action={raffleStep}>
            <input type="hidden" name="id" value={raffle.id} />
            <input type="hidden" name="step" value={next.step} />
            <button className="btn btn--primary" type="submit">
              {next.label}
            </button>
          </form>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 8 }}>
        <strong>OBS browser source</strong>
        <code className="hash">{siteUrl(`/overlay/raffle/${raffle.overlayToken}`)}</code>
        <span className="meta">1920×1080, transparent background. Keep this link private — anyone with it can watch the overlay.</span>
        {raffle.seedHash ? (
          <>
            <span className="meta">Seed fingerprint</span>
            <code className="hash">{raffle.seedHash}</code>
          </>
        ) : null}
      </section>

      {winners.length ? (
        <section className="card">
          <strong>Winners</strong>
          {winners.map((w) => (
            <div key={w.position} className="admin-row">
              <div className="admin-row__body">
                {ordinal(w.position)} · {w.name}
              </div>
              <span className="num" style={{ color: 'var(--color-accent)' }}>
                {formatUsd(w.prize)}
              </span>
              {w.paidAt ? (
                <span className="tag tag--accent">Paid</span>
              ) : (
                <form action={markRafflePrizePaid}>
                  <input type="hidden" name="raffleId" value={raffle.id} />
                  <input type="hidden" name="position" value={w.position} />
                  <input type="hidden" name="back" value={`/admin/raffles/${raffle.id}`} />
                  <button className="btn btn--secondary" type="submit">
                    Mark paid
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <section className="card stack">
        <strong>Settings</strong>
        <RaffleForm raffle={raffle} />
      </section>

      <section className="card">
        <strong>{raffle.status === 'open' || raffle.status === 'draft' ? 'Tickets right now' : 'Frozen tickets'}</strong>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th style={{ textAlign: 'right' }}>Wagered</th>
                <th style={{ textAlign: 'right' }}>Tickets</th>
                <th style={{ textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.userId}>
                  <td>{t.name}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {formatUsd(t.wagered)}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {t.tickets}
                  </td>
                  <td className="num meta" style={{ textAlign: 'right' }}>
                    {((t.tickets / total) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 ? <p className="meta" style={{ padding: 8 }}>No tickets yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
