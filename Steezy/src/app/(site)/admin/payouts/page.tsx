import type { Metadata } from 'next';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { markMilestonePaid, markPrizePaid } from '@/server/actions/admin';
import { markGiveawayPaid, markRafflePrizePaid } from '@/server/actions/draws';
import { unpaidDrawPrizes, unpaidLeaderboardPrizes } from '@/server/services/admin';
import { pendingMilestoneClaims } from '@/server/services/milestones';
import { getRoobetLink } from '@/server/services/member';
import { formatAgo, formatUsd, ordinal } from '@/lib/format';

export const metadata: Metadata = { title: 'Payouts' };

export default async function PayoutsPage({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [claims, prizes, draws] = await Promise.all([pendingMilestoneClaims(), unpaidLeaderboardPrizes(), unpaidDrawPrizes()]);
  const claimLinks = await Promise.all(claims.map((c) => getRoobetLink(c.userId)));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Queue</span>
        <h1 className="admin__title">Payouts</h1>
        <p className="meta">Tip each reward on Roobet to the username shown, then mark it paid here.</p>
      </div>
      <Flash {...flash} />

      <section className="card">
        <strong>Milestone claims · {claims.length}</strong>
        {claims.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>Nothing to pay.</p> : null}
        {claims.map((c, i) => (
          <div key={c.id} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>
                {c.userName} · {c.milestone}
              </div>
              <div className="meta">
                Tip to Roobet <b>{claimLinks[i]?.requestedUsername ?? '—'}</b> · claimed {formatAgo(c.claimedAt)}
              </div>
            </div>
            <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
              {formatUsd(c.reward)}
            </span>
            <form action={markMilestonePaid}>
              <input type="hidden" name="claimId" value={c.id} />
              <button className="btn btn--secondary" type="submit">
                Mark paid
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="card">
        <strong>Leaderboard prizes · {prizes.length}</strong>
        {prizes.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>Nothing to pay. Prizes appear here once a board is frozen.</p> : null}
        {prizes.map((p) => (
          <div key={`${p.leaderboardId}-${p.rank}`} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>
                {p.board} · {ordinal(p.rank)}
              </div>
              <div className="meta">
                {p.roobetUsername ? (
                  <>
                    Tip to Roobet <b>{p.roobetUsername}</b> (member {p.memberName})
                  </>
                ) : (
                  <>Not linked to a member — shown as {p.displayName}, uid {p.roobetUid.slice(0, 8)}…</>
                )}
              </div>
            </div>
            <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
              {formatUsd(p.prize)}
            </span>
            <form action={markPrizePaid}>
              <input type="hidden" name="leaderboardId" value={p.leaderboardId} />
              <input type="hidden" name="rank" value={p.rank} />
              <button className="btn btn--secondary" type="submit">
                Mark paid
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="card">
        <strong>Raffle & giveaway prizes · {draws.raffleRows.length + draws.giveawayRows.length}</strong>
        {draws.raffleRows.length + draws.giveawayRows.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>Nothing to pay.</p> : null}
        {draws.raffleRows.map((r) => (
          <div key={`r-${r.drawId}-${r.position}`} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>
                {r.draw} · {ordinal(r.position)}
              </div>
              <div className="meta">
                Tip to Roobet <b>{r.roobetUsername ?? '—'}</b> (member {r.memberName})
              </div>
            </div>
            <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
              {formatUsd(r.prize)}
            </span>
            <form action={markRafflePrizePaid}>
              <input type="hidden" name="raffleId" value={r.drawId} />
              <input type="hidden" name="position" value={r.position} />
              <button className="btn btn--secondary" type="submit">
                Mark paid
              </button>
            </form>
          </div>
        ))}
        {draws.giveawayRows.map((g) => (
          <div key={`g-${g.drawId}-${g.position}`} className="admin-row">
            <div className="admin-row__body">
              <div style={{ fontWeight: 500 }}>
                Giveaway: {g.draw} · {ordinal(g.position)}
              </div>
              <div className="meta">
                Winner {g.memberName}
                {g.kickUsername ? ` (Kick ${g.kickUsername})` : ''} · Roobet {g.roobetUsername ?? 'not linked'}
              </div>
            </div>
            <form action={markGiveawayPaid}>
              <input type="hidden" name="giveawayId" value={g.drawId} />
              <input type="hidden" name="position" value={g.position} />
              <button className="btn btn--secondary" type="submit">
                Mark paid
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
