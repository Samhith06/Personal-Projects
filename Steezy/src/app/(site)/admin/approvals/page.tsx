import type { Metadata } from 'next';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { approveRoobet, rejectRoobet, unlockRoobet } from '@/server/actions/admin';
import { discordAccountCreatedAt } from '@/lib/discord';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { findRoobetCandidate, roobetLinksByStatus } from '@/server/services/admin';
import { formatAgo, formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Roobet approvals' };

export default async function ApprovalsPage({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [me, pending, approved, rejected] = await Promise.all([
    getCurrentUser(),
    roobetLinksByStatus('pending'),
    roobetLinksByStatus('approved', 50),
    roobetLinksByStatus('rejected', 20),
  ]);
  const candidates = await Promise.all(pending.map((p) => findRoobetCandidate(p.requestedUsername, p.userId)));
  const isOwner = hasRole(me, 'owner');

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Queue</span>
        <h1 className="admin__title">Roobet approvals</h1>
        <p className="meta">
          Each username is checked against STZY affiliate data. Approving locks the member to that Roobet account&apos;s id.
        </p>
      </div>
      <Flash {...flash} />

      <section className="card">
        <strong>Pending · {pending.length}</strong>
        {pending.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>Nothing waiting.</p> : null}
        {pending.map((p, i) => {
          const c = candidates[i];
          const discordAgeDays = Math.floor((Date.now() - discordAccountCreatedAt(p.discordId).getTime()) / 86_400_000);
          return (
            <div key={p.userId} className="admin-row">
              <div className="admin-row__body">
                <div style={{ fontWeight: 500 }}>{p.requestedUsername}</div>
                <div className="meta">
                  Discord {p.discordUsername} ({discordAgeDays}d old) · Kick {p.kickUsername ?? '—'} · submitted {formatAgo(p.updatedAt)}
                </div>
              </div>
              {c ? (
                c.takenBy ? (
                  <span className="tag tag--danger">Already approved for another member</span>
                ) : (
                  <span className="tag tag--accent">
                    Found as {c.username} · {formatUsd(c.lifetime)} lifetime
                  </span>
                )
              ) : (
                <span className="tag tag--danger">Not in STZY data</span>
              )}
              <form action={approveRoobet}>
                <input type="hidden" name="userId" value={p.userId} />
                <button className="btn btn--primary" type="submit" disabled={!c || Boolean(c.takenBy)}>
                  Approve
                </button>
              </form>
              <form action={rejectRoobet}>
                <input type="hidden" name="userId" value={p.userId} />
                <label className="visually-hidden" htmlFor={`reason-${p.userId}`}>
                  Reason
                </label>
                <input id={`reason-${p.userId}`} name="reason" className="input" placeholder="Reason (shown to member)" style={{ width: 220 }} />
                <button className="btn btn--danger" type="submit">
                  Reject
                </button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="card">
        <strong>Approved · latest {approved.length}</strong>
        {approved.map((a) => (
          <div key={a.userId} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>{a.requestedUsername}</div>
              <div className="meta">
                Discord {a.discordUsername} · uid {a.roobetUid?.slice(0, 8)}… · by {a.reviewerName ?? '—'}
                {a.reviewedAt ? ` ${formatAgo(a.reviewedAt)}` : ''}
              </div>
            </div>
            <span className="tag tag--warn">Locked</span>
            {isOwner ? (
              <form action={unlockRoobet}>
                <input type="hidden" name="userId" value={a.userId} />
                <button className="btn btn--secondary" type="submit">
                  Unlock
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </section>

      <section className="card">
        <strong>Recently rejected</strong>
        {rejected.map((r) => (
          <div key={r.userId} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>{r.requestedUsername}</div>
              <div className="meta">
                Discord {r.discordUsername} · {r.rejectReason}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
