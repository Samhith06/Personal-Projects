'use server';

/**
 * Admin server actions. Every one re-checks the staff role and writes the
 * audit log; hiding a button in the UI is never the security boundary.
 *
 *   mod    Roobet approvals/rejections, marking payouts paid
 *   admin  + leaderboards and milestone tiers
 *   owner  + unlocking an approved Roobet username
 */
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { leaderboardResults, leaderboards, milestoneClaims, milestones, roobetLinks, users } from '@/server/db/schema';
import { requireRole } from '@/server/auth/session';
import { findRoobetCandidate } from '@/server/services/admin';
import { audit } from '@/server/services/audit';
import { freezeLeaderboard, getLeaderboard } from '@/server/services/leaderboards';

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params)}`);
}
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

/* ----------------------------------------------------------- Roobet approvals */

export async function approveRoobet(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const userId = str(fd, 'userId');
  const [link] = await db.select().from(roobetLinks).where(eq(roobetLinks.userId, userId)).limit(1);
  if (!link || link.status !== 'pending') back('/admin/approvals', { error: 'That request is no longer pending.' });

  const candidate = await findRoobetCandidate(link!.requestedUsername, userId);
  if (!candidate) back('/admin/approvals', { error: `“${link!.requestedUsername}” isn’t in STZY affiliate data — reject it instead.` });
  if (candidate!.takenBy) back('/admin/approvals', { error: 'That Roobet account is already approved for another member.' });

  const now = new Date();
  await db
    .update(roobetLinks)
    // Store Roobet's own spelling so payouts are tipped to the exact name.
    .set({
      status: 'approved',
      roobetUid: candidate!.uid,
      requestedUsername: candidate!.username,
      rejectReason: null,
      reviewedBy: staff.id,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(roobetLinks.userId, userId));
  await audit(staff.id, 'roobet.approve', 'user', userId, { status: link!.status }, { username: link!.requestedUsername, uid: candidate!.uid });
  back('/admin/approvals', { ok: `Approved ${link!.requestedUsername}.` });
}

export async function rejectRoobet(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const userId = str(fd, 'userId');
  const reason = str(fd, 'reason') || 'That username isn’t signed up under code STZY.';
  const now = new Date();
  const updated = await db
    .update(roobetLinks)
    .set({ status: 'rejected', rejectReason: reason.slice(0, 300), reviewedBy: staff.id, reviewedAt: now, updatedAt: now })
    .where(and(eq(roobetLinks.userId, userId), eq(roobetLinks.status, 'pending')))
    .returning({ username: roobetLinks.requestedUsername });
  if (!updated.length) back('/admin/approvals', { error: 'That request is no longer pending.' });
  await audit(staff.id, 'roobet.reject', 'user', userId, null, { username: updated[0].username, reason });
  back('/admin/approvals', { ok: `Rejected ${updated[0].username}.` });
}

/** Owner only: release an approved username so the member can submit a new one. */
export async function unlockRoobet(fd: FormData): Promise<void> {
  const staff = await requireRole('owner');
  const userId = str(fd, 'userId');
  const now = new Date();
  const updated = await db
    .update(roobetLinks)
    .set({ status: 'rejected', roobetUid: null, rejectReason: 'Unlocked by an admin — submit your username again.', reviewedBy: staff.id, reviewedAt: now, updatedAt: now })
    .where(and(eq(roobetLinks.userId, userId), eq(roobetLinks.status, 'approved')))
    .returning({ username: roobetLinks.requestedUsername });
  if (!updated.length) back('/admin/approvals', { error: 'That username isn’t approved.' });
  await audit(staff.id, 'roobet.unlock', 'user', userId, null, { username: updated[0].username });
  back('/admin/approvals', { ok: `Unlocked ${updated[0].username}.` });
}

/* -------------------------------------------------------------------- Payouts */

export async function markMilestonePaid(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'claimId');
  const updated = await db
    .update(milestoneClaims)
    .set({ status: 'paid', paidAt: new Date(), paidBy: staff.id })
    .where(and(eq(milestoneClaims.id, id), eq(milestoneClaims.status, 'claimed')))
    .returning({ id: milestoneClaims.id });
  if (updated.length) await audit(staff.id, 'milestone.paid', 'milestone_claim', id);
  back('/admin/payouts', { ok: 'Marked paid.' });
}

export async function markPrizePaid(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const leaderboardId = str(fd, 'leaderboardId');
  const rank = Number(str(fd, 'rank'));
  await db
    .update(leaderboardResults)
    .set({ paidAt: new Date() })
    .where(and(eq(leaderboardResults.leaderboardId, leaderboardId), eq(leaderboardResults.rank, rank)));
  await audit(staff.id, 'leaderboard.prize_paid', 'leaderboard', leaderboardId, null, { rank });
  back('/admin/payouts', { ok: 'Marked paid.' });
}

/* -------------------------------------------------------------------- Members */

/** Who referred a member to play under the code. Returns instead of redirecting so the table edits in place. */
export async function setReferredBy(fd: FormData): Promise<{ error?: string }> {
  const staff = await requireRole('admin');
  const userId = str(fd, 'userId');
  const referredBy = str(fd, 'referredBy').replace(/^@/, '').slice(0, 64) || null;
  const [before] = await db.select({ referredBy: users.referredBy }).from(users).where(eq(users.id, userId)).limit(1);
  if (!before) return { error: 'Member not found.' };
  if (before.referredBy === referredBy) return {};
  await db.update(users).set({ referredBy }).where(eq(users.id, userId));
  await audit(staff.id, 'member.referred_by', 'user', userId, before, { referredBy });
  revalidatePath('/admin/members');
  return {};
}

/* --------------------------------------------------------------- Leaderboards */

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');
const boardForm = z
  .object({
    name: z.string().trim().min(1, 'Give the board a name').max(80),
    startDay: isoDay,
    endDay: isoDay,
    metric: z.enum(['wagered', 'weighted']),
    minWager: z.coerce.number().min(0),
    prizes: z
      .string()
      .transform((s) => s.split(/[\s,]+/).filter(Boolean).map(Number))
      .refine((a) => a.every((n) => Number.isFinite(n) && n >= 0), 'Prizes must be numbers, e.g. 1200, 700, 400'),
  })
  .refine((v) => v.endDay >= v.startDay, 'The end date is before the start date');

export async function saveLeaderboard(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const parsed = boardForm.safeParse({
    name: str(fd, 'name'),
    startDay: str(fd, 'startDay'),
    endDay: str(fd, 'endDay'),
    metric: str(fd, 'metric') || 'weighted',
    minWager: str(fd, 'minWager') || '0',
    prizes: str(fd, 'prizes'),
  });
  const path = id ? `/admin/leaderboards/${id}` : '/admin/leaderboards';
  if (!parsed.success) back(path, { error: parsed.error.issues[0].message });
  const v = parsed.data!;

  const values = {
    name: v.name,
    // Windows cover whole UTC days.
    startsAt: new Date(`${v.startDay}T00:00:00.000Z`),
    endsAt: new Date(`${v.endDay}T23:59:59.999Z`),
    metric: v.metric,
    minWager: v.minWager,
    prizes: v.prizes,
  };

  if (id) {
    const before = await getLeaderboard(id);
    if (!before) back('/admin/leaderboards', { error: 'Leaderboard not found.' });
    if (before!.status === 'frozen' || before!.status === 'published') back(path, { error: 'A frozen board can’t be edited.' });
    await db.update(leaderboards).set(values).where(eq(leaderboards.id, id));
    await audit(staff.id, 'leaderboard.update', 'leaderboard', id, before, values);
    back(path, { ok: 'Saved.' });
  }

  const [created] = await db.insert(leaderboards).values(values).returning({ id: leaderboards.id });
  await audit(staff.id, 'leaderboard.create', 'leaderboard', created.id, null, values);
  back(`/admin/leaderboards/${created.id}`, { ok: 'Created as a draft. Set it live when ready.' });
}

export async function setLeaderboardStatus(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const to = str(fd, 'status');
  const path = `/admin/leaderboards/${id}`;
  const board = await getLeaderboard(id);
  if (!board) back('/admin/leaderboards', { error: 'Leaderboard not found.' });

  if (to === 'frozen') {
    await freezeLeaderboard(id, staff.id);
    back(path, { ok: 'Frozen. Final standings are locked in.' });
  }

  const allowed: Record<string, string[]> = { draft: ['live'], live: ['draft'], frozen: ['published'] };
  if (!allowed[board!.status]?.includes(to)) back(path, { error: `Can’t go from ${board!.status} to ${to}.` });
  await db.update(leaderboards).set({ status: to }).where(eq(leaderboards.id, id));
  await audit(staff.id, 'leaderboard.status', 'leaderboard', id, { status: board!.status }, { status: to });
  back(path, { ok: `Status: ${to}.` });
}

/** Delete a leaderboard and its frozen results. Admin only; kept in the audit log. */
export async function deleteLeaderboard(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const board = await getLeaderboard(id);
  if (!board) back('/admin/leaderboards', { error: 'Leaderboard not found.' });
  await db.delete(leaderboards).where(eq(leaderboards.id, id));
  await audit(staff.id, 'leaderboard.delete', 'leaderboard', id, board, null);
  back('/admin/leaderboards', { ok: `Deleted “${board!.name}”.` });
}

/* ----------------------------------------------------------------- Milestones */

const milestoneForm = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  threshold: z.coerce.number().positive('Threshold must be above 0'),
  reward: z.coerce.number().min(0),
  active: z.boolean(),
});

export async function saveMilestone(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const parsed = milestoneForm.safeParse({
    name: str(fd, 'name'),
    threshold: str(fd, 'threshold'),
    reward: str(fd, 'reward'),
    active: fd.get('active') === 'on',
  });
  if (!parsed.success) back('/admin/milestones', { error: parsed.error.issues[0].message });

  if (id) {
    const [before] = await db.select().from(milestones).where(eq(milestones.id, id)).limit(1);
    await db.update(milestones).set(parsed.data!).where(eq(milestones.id, id));
    await audit(staff.id, 'milestone.update', 'milestone', id, before ?? null, parsed.data);
  } else {
    const [created] = await db.insert(milestones).values(parsed.data!).returning({ id: milestones.id });
    await audit(staff.id, 'milestone.create', 'milestone', created.id, null, parsed.data);
  }
  back('/admin/milestones', { ok: `Saved ${parsed.data!.name}.` });
}
