import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { queueCounts } from '@/server/services/admin';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · SteezeSpins' }, robots: { index: false } };

/** Staff only. Every admin server action re-checks the role too — this layout is not the security boundary. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/admin');
  if (!hasRole(user, 'mod')) notFound();

  const counts = await queueCounts();
  const Count = ({ n, danger }: { n: number; danger?: boolean }) =>
    n ? <span className={`admin-count${danger ? ' admin-count--danger' : ''}`}>{n}</span> : null;

  return (
    <div className="admin">
      <aside className="admin__side">
        <div className="admin__role">
          Signed in as <b>{user.discordUsername}</b> <span className="tag tag--neutral">{user.role}</span>
        </div>
        <nav className="admin__nav" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/approvals">
            Roobet approvals <Count n={counts.approvals} />
          </Link>
          <Link href="/admin/payouts">
            Payouts <Count n={counts.payouts} />
          </Link>
          <span className="admin__group">Stream games</span>
          <Link href="/admin/leaderboards">Leaderboards</Link>
          <Link href="/admin/milestones">Milestones</Link>
          <Link href="/admin/raffles">Raffles</Link>
          <Link href="/admin/giveaways">Giveaways</Link>
          <Link href="/admin/hunts">Bonus hunts</Link>
          <Link href="/admin/tournaments">Tournaments</Link>
          <span className="admin__group">System</span>
          <Link href="/admin/audit">
            Audit log <Count n={counts.flags} danger />
          </Link>
        </nav>
      </aside>
      <div className="admin__main">{children}</div>
    </div>
  );
}
