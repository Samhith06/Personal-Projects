import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { GiveawayForm } from '@/components/admin/DrawForms';
import { ConfirmSubmit } from '@/components/admin/ConfirmSubmit';
import { deleteGiveaway } from '@/server/actions/draws';
import { entryCount, listGiveaways } from '@/server/services/giveaways';

export const metadata: Metadata = { title: 'Giveaways' };

const TAG: Record<string, string> = { draft: 'tag tag--neutral', open: 'tag tag--accent', closed: 'tag tag--warn', drawn: 'tag tag--neutral' };

/** Draft and open giveaways stay at the top; closed and drawn ones move to History. */
const ACTIVE = new Set(['draft', 'open']);

type Row = Awaited<ReturnType<typeof listGiveaways>>[number];

function GiveawayRow({ g, entries }: { g: Row; entries: number }) {
  return (
    <div className="admin-row">
      <div className="admin-row__body">
        <Link href={`/admin/giveaways/${g.id}`} style={{ fontWeight: 500 }}>
          {g.prize}
        </Link>
        <div className="meta">
          {g.title} · {entries} entries · {g.winnersCount} winner{g.winnersCount === 1 ? '' : 's'}
          {g.entryKeyword ? ` · ${g.entryKeyword}` : ''}
        </div>
      </div>
      <span className={TAG[g.status] ?? 'tag tag--neutral'}>{g.status}</span>
      <form action={deleteGiveaway}>
        <input type="hidden" name="id" value={g.id} />
        <ConfirmSubmit className="btn btn--danger" message={`Delete “${g.prize}” and its ${entries} entries? This can't be undone.`}>
          Delete
        </ConfirmSubmit>
      </form>
    </div>
  );
}

export default async function GiveawaysAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const rows = await listGiveaways();
  const counts = new Map(await Promise.all(rows.map(async (g) => [g.id, await entryCount(g.id)] as const)));
  const active = rows.filter((g) => ACTIVE.has(g.status));
  const history = rows.filter((g) => !ACTIVE.has(g.status));
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Moderation</span>
        <h1 className="admin__title">Giveaways</h1>
        <p className="meta">Draft → open (members join on the site or with the chat keyword) → closed → drawn live on the overlay.</p>
      </div>
      <Flash {...flash} />
      <section className="card stack">
        <strong>New giveaway</strong>
        <GiveawayForm />
      </section>
      <section className="card">
        <strong>Active</strong>
        {active.length === 0 ? <p className="meta">No open giveaways.</p> : null}
        {active.map((g) => (
          <GiveawayRow key={g.id} g={g} entries={counts.get(g.id) ?? 0} />
        ))}
      </section>
      <section className="card">
        <strong>History</strong>
        {history.length === 0 ? <p className="meta">Closed and drawn giveaways show up here.</p> : null}
        {history.map((g) => (
          <GiveawayRow key={g.id} g={g} entries={counts.get(g.id) ?? 0} />
        ))}
      </section>
    </div>
  );
}
