import type { Metadata } from 'next';
import { recentAudit } from '@/server/services/admin';

export const metadata: Metadata = { title: 'Audit log' };

export default async function AuditPage() {
  const rows = await recentAudit(200);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">System</span>
        <h1 className="admin__title">Audit log</h1>
        <p className="meta">Every staff action and every automatic one (shown as “system”). Latest 200.</p>
      </div>
      <section className="card" style={{ padding: '8px 12px' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="meta num" style={{ whiteSpace: 'nowrap' }}>
                    {r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td>{r.actorName ?? 'system'}</td>
                  <td>
                    <code>{r.action}</code>
                  </td>
                  <td className="meta">{r.targetType ? `${r.targetType} ${r.targetId?.slice(0, 8) ?? ''}` : '—'}</td>
                  <td className="meta" style={{ maxWidth: 360, overflowWrap: 'anywhere' }}>
                    {r.after ? JSON.stringify(r.after) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="meta" style={{ padding: 8 }}>Nothing logged yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
