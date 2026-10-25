'use server';

/**
 * Deny or delete a reward in the Payouts queue. Deny forfeits the prize but
 * keeps the record (milestone claims become `rejected`, prizes get
 * `deniedAt`); delete removes the row. Admin only; both are audited.
 */
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { giveawayWinners, leaderboardResults, milestoneClaims, raffleWinners } from '@/server/db/schema';
import { requireRole } from '@/server/auth/session';
import { audit } from '@/server/services/audit';

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

export async function resolvePayout(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const kind = str(fd, 'kind');
  const op = str(fd, 'op');
  if (op !== 'deny' && op !== 'delete') redirect('/admin/payouts?error=Unknown+action.');
  const deny = op === 'deny';
  const id = str(fd, 'id');
  const place = Number(str(fd, 'place'));

  if (kind === 'milestone') {
    const where = and(eq(milestoneClaims.id, id), eq(milestoneClaims.status, 'claimed'));
    if (deny) await db.update(milestoneClaims).set({ status: 'rejected' }).where(where);
    else await db.delete(milestoneClaims).where(where);
    await audit(staff.id, `milestone.claim_${op}`, 'milestone_claim', id);
  } else if (kind === 'leaderboard') {
    const where = and(eq(leaderboardResults.leaderboardId, id), eq(leaderboardResults.rank, place));
    if (deny) await db.update(leaderboardResults).set({ deniedAt: new Date() }).where(where);
    else await db.delete(leaderboardResults).where(where);
    await audit(staff.id, `leaderboard.prize_${op}`, 'leaderboard', id, null, { rank: place });
  } else if (kind === 'raffle') {
    const where = and(eq(raffleWinners.raffleId, id), eq(raffleWinners.position, place));
    if (deny) await db.update(raffleWinners).set({ deniedAt: new Date() }).where(where);
    else await db.delete(raffleWinners).where(where);
    await audit(staff.id, `raffle.prize_${op}`, 'raffle', id, null, { position: place });
  } else if (kind === 'giveaway') {
    const where = and(eq(giveawayWinners.giveawayId, id), eq(giveawayWinners.position, place));
    if (deny) await db.update(giveawayWinners).set({ deniedAt: new Date() }).where(where);
    else await db.delete(giveawayWinners).where(where);
    await audit(staff.id, `giveaway.prize_${op}`, 'giveaway', id, null, { position: place });
  } else {
    redirect('/admin/payouts?error=Unknown+payout.');
  }
  redirect(`/admin/payouts?${new URLSearchParams({ ok: deny ? 'Denied — the prize is forfeited.' : 'Deleted.' })}`);
}
