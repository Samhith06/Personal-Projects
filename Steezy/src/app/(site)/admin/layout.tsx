import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { queueCounts } from '@/server/services/admin';
import { syncStatus } from '@/server/services/sync-status';
import { formatAgo } from '@/lib/format';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · SteezySpins' }, robots: { index: false } };

/**
 * The staff area, inside the normal site header (MattySpins layout). The amber
 * staff bar makes it obvious that actions here are logged.
 *
 * Staff only. Every admin server action re-checks the role too — this layout is not the security boundary.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/admin');
  if (!hasRole(user, 'mod')) notFound();

  const [counts, sync] = await Promise.all([queueCounts(), syncStatus('roobet')]);
  const stale = !sync?.lastOkAt || Date.now() - sync.lastOkAt.getTime() > 60 * 60 * 1000;

  return (
    <div className="admin">
      <div className="staffbar">
        <span className="staffbar__title">◆ Staff area</span>
        <span className="staffbar__who">
          Signed in as <b>{user.discordUsername}</b> · {user.role} · every action here is written to the audit log
        </span>
        <span className={`staffbar__sync${stale ? ' is-stale' : ''}`}>
          <i />
          {sync?.lastOkAt ? `Roobet synced ${formatAgo(sync.lastOkAt)}` : 'Roobet never synced'}
        </span>
      </div>
      <aside className="admin__side">
        <AdminNav counts={counts} />
      </aside>
      <div className="admin__main">{children}</div>
    </div>
  );
}
