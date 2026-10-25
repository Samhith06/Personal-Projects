import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/admin/Flash';
import { GiveawayForm } from '@/components/admin/DrawForms';
import { deleteGiveaway, giveawayStep, markGiveawayPaid } from '@/server/actions/draws';
import { ConfirmSubmit } from '@/components/admin/ConfirmSubmit';
import { entrantNames, entryCount, getGiveaway, getGiveawayWinners } from '@/server/services/giveaways';
import { siteUrl } from '@/lib/env';
import { ordinal } from '@/lib/format';
import { CopyLink } from '@/components/admin/CopyLink';

export const metadata: Metadata = { title: 'Giveaway' };

const NEXT: Record<string, { step: string; label: string; note: string }> = {
  draft: { step: 'open', label: 'Open giveaway', note: 'Starts taking entries and publishes the seed fingerprint.' },
  open: { step: 'close', label: 'Close entries', note: 'Freezes the entry list. Happens automatically at the close time if one is set.' },
  closed: { step: 'draw', label: 'Draw winner', note: 'The overlay plays the draw and shows the winner straight away.' },
};

export default async function GiveawayAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const flash = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const g = await getGiveaway(id);
  if (!g) notFound();
  const [count, names, winners] = await Promise.all([entryCount(id), entrantNames(id, 200), getGiveawayWinners(id)]);
  const next = NEXT[g.status];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/giveaways" className="meta">
          ← Giveaways
        </Link>
        <h1 className="admin__title">{g.prize}</h1>
        <p className="meta">
          {g.title} · status {g.status} · {count} entries
        </p>
      </div>
      <Flash {...flash} />

      {next ? (
        <section className="card row" style={{ justifyContent: 'space-between' }}>
          <span className="meta" style={{ flex: '1 1 300px' }}>
            {next.note}
          </span>
          <form action={giveawayStep}>
            <input type="hidden" name="id" value={g.id} />
            <input type="hidden" name="step" value={next.step} />
            <button className="btn btn--primary" type="submit">
              {next.label}
            </button>
          </form>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 8 }}>
        <strong>OBS browser source</strong>
        <CopyLink value={siteUrl(`/overlay/giveaway/${g.overlayToken}`)} />
        <span className="meta">1920×1080, transparent background. Keep this link private.</span>
        {g.seedHash ? (
          <>
            <span className="meta">Seed fingerprint</span>
            <code className="hash">{g.seedHash}</code>
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
              {w.paidAt ? (
                <span className="tag tag--accent">Paid</span>
              ) : (
                <form action={markGiveawayPaid}>
                  <input type="hidden" name="giveawayId" value={g.id} />
                  <input type="hidden" name="position" value={w.position} />
                  <input type="hidden" name="back" value={`/admin/giveaways/${g.id}`} />
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
        <GiveawayForm giveaway={g} />
      </section>

      <section className="card stack" style={{ gap: 8 }}>
        <strong>Entries · {count}</strong>
        <p className="meta" style={{ lineHeight: 1.8 }}>
          {names.length ? names.join(' · ') : 'No entries yet.'}
          {count > names.length ? ` · and ${count - names.length} more` : ''}
        </p>
      </section>

      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="meta" style={{ flex: '1 1 300px' }}>
          Deletes the giveaway with its entries and winners. Can&apos;t be undone.
        </span>
        <form action={deleteGiveaway}>
          <input type="hidden" name="id" value={g.id} />
          <ConfirmSubmit
            className="btn btn--danger"
            message={
              winners.some((w) => !w.paidAt)
                ? `Delete “${g.prize}”? It has unpaid winners, and they'll disappear from Payouts too.`
                : `Delete “${g.prize}” and its ${count} entries?`
            }
          >
            Delete giveaway
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
