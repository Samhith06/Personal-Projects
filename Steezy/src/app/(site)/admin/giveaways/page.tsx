import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { GiveawayForm } from '@/components/admin/DrawForms';
import { entryCount, listGiveaways } from '@/server/services/giveaways';

export const metadata: Metadata = { title: 'Giveaways' };

const TAG: Record<string, string> = { draft: 'tag tag--neutral', open: 'tag tag--accent', closed: 'tag tag--warn', drawn: 'tag tag--neutral' };

export default async function GiveawaysAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const rows = await listGiveaways();
  const counts = await Promise.all(rows.map((g) => entryCount(g.id)));
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Moderation</span>
        <h1 className="admin__title">Giveaways</h1>
        <p className="meta">Draft → open (members join on the site or with the chat keyword) → closed → drawn live on the overlay.</p>
      </div>
      <Flash {...flash} />
      <section className="card">
        {rows.length === 0 ? <p className="meta">No giveaways yet.</p> : null}
        {rows.map((g, i) => (
          <div key={g.id} className="admin-row">
            <div className="admin-row__body">
              <Link href={`/admin/giveaways/${g.id}`} style={{ fontWeight: 500 }}>
                {g.prize}
              </Link>
              <div className="meta">
                {g.title} · {counts[i]} entries · {g.winnersCount} winner{g.winnersCount === 1 ? '' : 's'}
                {g.entryKeyword ? ` · ${g.entryKeyword}` : ''}
              </div>
            </div>
            <span className={TAG[g.status] ?? 'tag tag--neutral'}>{g.status}</span>
          </div>
        ))}
      </section>
      <section className="card stack">
        <strong>New giveaway</strong>
        <GiveawayForm />
      </section>
    </div>
  );
}
