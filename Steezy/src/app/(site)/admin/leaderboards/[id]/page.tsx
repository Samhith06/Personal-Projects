import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/admin/Flash';
import { LeaderboardForm } from '@/components/admin/LeaderboardForm';
import { deleteLeaderboard, setLeaderboardStatus } from '@/server/actions/admin';
import { ConfirmSubmit } from '@/components/admin/ConfirmSubmit';
import { getLeaderboard, getStandings } from '@/server/services/leaderboards';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Edit leaderboard' };

const NEXT_STEPS: Record<string, { to: string; label: string; cls: string }[]> = {
  draft: [{ to: 'live', label: 'Set live', cls: 'btn btn--primary' }],
  live: [
    { to: 'frozen', label: 'Freeze now', cls: 'btn btn--secondary' },
    { to: 'draft', label: 'Back to draft', cls: 'btn btn--secondary' },
  ],
  frozen: [{ to: 'published', label: 'Mark published', cls: 'btn btn--secondary' }],
  published: [],
};

export default async function EditLeaderboard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  // Ids are UUIDs; anything else would make Postgres throw on the cast.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const board = await getLeaderboard(id);
  if (!board) notFound();
  const standings = await getStandings(board);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/leaderboards" className="meta">
          ← Leaderboards
        </Link>
        <h1 className="admin__title">{board.name}</h1>
        <p className="meta">Status: {board.status}</p>
      </div>
      <Flash {...flash} />

      <div className="row">
        {NEXT_STEPS[board.status]?.map((step) => (
          <form key={step.to} action={setLeaderboardStatus}>
            <input type="hidden" name="id" value={board.id} />
            <input type="hidden" name="status" value={step.to} />
            <button className={step.cls} type="submit">
              {step.label}
            </button>
          </form>
        ))}
      </div>

      <section className="card stack">
        <strong>Settings</strong>
        <LeaderboardForm board={board} />
      </section>

      <section className="card">
        <strong>{board.status === 'frozen' || board.status === 'published' ? 'Final standings' : 'Live standings preview'}</strong>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Shown as</th>
                <th>Member</th>
                <th style={{ textAlign: 'right' }}>Wagered</th>
                <th style={{ textAlign: 'right' }}>Prize</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, 100).map((s) => (
                <tr key={s.rank}>
                  <td className="meta num">{s.rank}</td>
                  <td>{s.displayName}</td>
                  <td className="meta">{s.userId ? 'linked' : '—'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {formatUsd(s.wagered)}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {s.prize ? formatUsd(s.prize) : '—'}
                  </td>
                  <td className="meta">{s.prize ? (s.paidAt ? 'yes' : 'no') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {standings.length === 0 ? <p className="meta" style={{ padding: 8 }}>No wagers in this window yet.</p> : null}
        </div>
      </section>

      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="meta" style={{ flex: '1 1 300px' }}>
          Deletes the board and its final standings. Can&apos;t be undone.
        </span>
        <form action={deleteLeaderboard}>
          <input type="hidden" name="id" value={board.id} />
          <ConfirmSubmit
            className="btn btn--danger"
            message={
              board.status === 'frozen' || board.status === 'published'
                ? `Delete “${board.name}”? Its final standings go too, and any unpaid prizes disappear from Payouts.`
                : `Delete “${board.name}”?`
            }
          >
            Delete leaderboard
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
