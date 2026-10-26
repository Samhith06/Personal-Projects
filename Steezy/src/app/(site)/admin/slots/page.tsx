import type { Metadata } from 'next';
import Link from 'next/link';
import { AddSlotForm, RemoveSlotButton, SyncSlotsButton } from '@/components/admin/SlotControls';
import { SlotArt } from '@/components/stream-games/SlotArt';
import { catalogStats, searchSlots } from '@/server/services/slots';
import { dateShort, formatAgo } from '@/lib/format';

export const metadata: Metadata = { title: 'Slot catalog' };

const PER_PAGE = 50;
const n = (v: number) => v.toLocaleString('en-US');

/** The slot catalog the hunt and `!sr` pick from (ported from MattySpins' /admin/slots). */
export default async function AdminSlotsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page) || 1);

  const [stats, { slots, total }] = await Promise.all([catalogStats(), searchSlots({ q, page, perPage: PER_PAGE })]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => `/admin/slots?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <span className="kicker">
          {n(stats.total)} slots · {n(stats.providers)} providers
        </span>
        <h1 className="admin__title">Slot catalog</h1>
        <p className="admin__sub">
          Synced from bonushunt.gg&rsquo;s new-slots feed, which covers the last seven days, so the catalog grows with every sync. It syncs on
          its own every six hours. {stats.lastSyncedAt ? `Last synced ${formatAgo(new Date(stats.lastSyncedAt))}.` : 'Never synced.'} Used by the{' '}
          <Link href="/admin/hunt">bonus hunt</Link> and <Link href="/admin/tournament">tournament</Link>.
        </p>
      </div>

      <div className="card">
        <SyncSlotsButton />
      </div>

      <AddSlotForm />

      <form className="row" action="/admin/slots" style={{ gap: 10 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Slot or provider…" aria-label="Search slots" style={{ maxWidth: 320 }} />
        <button className="btn btn--secondary" type="submit">
          Search
        </button>
      </form>

      {slots.length === 0 ? (
        <div className="emptyq">{q ? `Nothing matches “${q}”.` : 'The catalog is empty. Sync it from bonushunt.gg above.'}</div>
      ) : (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Casinos</th>
                <th>Source</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>
                    <div className="slotcell">
                      <SlotArt src={slot.imageUrl} name={slot.name} />
                      <span>
                        <b>{slot.name}</b>
                        <small>
                          {slot.provider || '—'}
                          {slot.bonusBuy ? ' · bonus buy' : ''}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="meta" style={{ maxWidth: 220 }}>
                    {slot.casinos.length ? slot.casinos.join(', ') : '—'}
                  </td>
                  <td className="meta">{slot.source}</td>
                  <td className="meta">{dateShort(slot.addedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RemoveSlotButton slotId={slot.id} name={slot.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="row meta" style={{ gap: 14 }}>
          {page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : null}
          <span>
            Page {page} of {pages} · {n(total)} slots
          </span>
          {page < pages ? <Link href={href(page + 1)}>Next →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
