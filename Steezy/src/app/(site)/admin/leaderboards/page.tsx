import type { Metadata } from 'next';
import Link from 'next/link';
import { ConfirmSubmit } from '@/components/admin/ConfirmSubmit';
import { DoublePointsPanel } from '@/components/admin/DoublePointsPanel';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { LeaderboardForm } from '@/components/admin/LeaderboardForm';
import { deleteLeaderboard, postStandingsNow } from '@/server/actions/admin';
import { listLeaderboards } from '@/server/services/leaderboards';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Leaderboards' };

const STATUS_TAG: Record<string, string> = {
  draft: 'tag tag--neutral',
  live: 'tag tag--accent',
  frozen: 'tag tag--warn',
  published: 'tag tag--neutral',
};

/** What a delete takes with it, for the confirm prompt. */
const deleteWarning = (name: string, status: string) =>
  status === 'frozen' || status === 'published'
    ? `Delete “${name}”? Its final standings go too, and any unpaid prizes disappear from Payouts. This can't be undone.`
    : `Delete “${name}”? This can't be undone.`;

export default async function LeaderboardsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const boards = await listLeaderboards();
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Moderation</span>
        <h1 className="admin__title">Leaderboards</h1>
        <p className="meta">Draft → live → frozen (final standings locked, prizes go to Payouts) → published. Live boards freeze automatically when they end.</p>
      </div>
      <Flash {...flash} />

      <DoublePointsPanel />

      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="meta" style={{ flex: '1 1 300px' }}>
          The live board&apos;s top places go to the Discord #leaderboard channel once a day. Post them now as well:
        </span>
        <form action={postStandingsNow}>
          <button className="btn btn--secondary" type="submit">
            Post standings to Discord
          </button>
        </form>
      </section>

      <section className="card stack">
        <strong>New leaderboard</strong>
        <LeaderboardForm />
      </section>

      <section className="card">
        <strong>History</strong>
        {boards.length === 0 ? <p className="meta">No leaderboards yet.</p> : null}
        {boards.map((b) => (
          <div key={b.id} className="admin-row">
            <div className="admin-row__body">
              <Link href={`/admin/leaderboards/${b.id}`} style={{ fontWeight: 500 }}>
                {b.name}
              </Link>
              <div className="meta">
                {fmt(b.startsAt)} – {fmt(b.endsAt)} · {formatUsd(b.prizes.reduce((a, c) => a + c, 0))} pool · {b.metric}
              </div>
            </div>
            <span className={STATUS_TAG[b.status] ?? 'tag tag--neutral'}>{b.status}</span>
            <form action={deleteLeaderboard}>
              <input type="hidden" name="id" value={b.id} />
              <ConfirmSubmit className="btn btn--danger" message={deleteWarning(b.name, b.status)}>
                Delete
              </ConfirmSubmit>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
