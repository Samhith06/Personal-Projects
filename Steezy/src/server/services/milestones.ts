/**
 * Lifetime-wager milestones. Each tier pays once per member, as a Roobet tip.
 *
 * Claiming needs an approved Roobet username and a member who isn't blocked
 * from rewards; the unique index on (user, milestone) is the final guard
 * against double claims.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { milestoneClaims, milestones, users } from '@/server/db/schema';
import { approvedRoobetUid, wagerTotalFor } from './wagers';
import { audit } from './audit';

export type MilestoneTier = typeof milestones.$inferSelect & {
  reached: boolean;
  claim: { status: string; claimedAt: Date; paidAt: Date | null } | null;
  claimable: boolean;
};

export async function activeMilestones() {
  return db.select().from(milestones).where(eq(milestones.active, true)).orderBy(asc(milestones.threshold));
}

export async function milestoneView(userId: string | null) {
  const tiers = await activeMilestones();
  if (!userId) {
    return { linked: false, blocked: false, lifetime: null as number | null, tiers: tiers.map((t) => ({ ...t, reached: false, claim: null, claimable: false })) };
  }

  const [uid, [user], claims] = await Promise.all([
    approvedRoobetUid(userId),
    db.select({ blocked: users.blockedFromRewards }).from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(milestoneClaims).where(eq(milestoneClaims.userId, userId)),
  ]);
  const lifetime = uid ? await wagerTotalFor(uid, null) : null;
  const blocked = user?.blocked ?? false;
  const byMilestone = new Map(claims.map((c) => [c.milestoneId, c]));

  const view: MilestoneTier[] = tiers.map((t) => {
    const c = byMilestone.get(t.id);
    const reached = lifetime !== null && lifetime >= t.threshold;
    return {
      ...t,
      reached,
      claim: c ? { status: c.status, claimedAt: c.claimedAt, paidAt: c.paidAt } : null,
      claimable: reached && !c && !blocked,
    };
  });
  return { linked: uid !== null, blocked, lifetime, tiers: view };
}

export type ClaimResult = 'claimed' | 'not_linked' | 'blocked' | 'not_reached' | 'already_claimed' | 'unknown';

export async function claimMilestone(userId: string, milestoneId: string): Promise<ClaimResult> {
  const { linked, blocked, tiers } = await milestoneView(userId);
  if (!linked) return 'not_linked';
  if (blocked) return 'blocked';
  const tier = tiers.find((t) => t.id === milestoneId);
  if (!tier) return 'unknown';
  if (tier.claim) return 'already_claimed';
  if (!tier.reached) return 'not_reached';

  const inserted = await db
    .insert(milestoneClaims)
    .values({ userId, milestoneId })
    .onConflictDoNothing()
    .returning({ id: milestoneClaims.id });
  if (!inserted.length) return 'already_claimed';
  await audit(userId, 'milestone.claim', 'milestone_claim', inserted[0].id, null, { milestone: tier.name, reward: tier.reward });
  return 'claimed';
}

/** Open claims for the payout queue, oldest first. */
export async function pendingMilestoneClaims() {
  return db
    .select({
      id: milestoneClaims.id,
      claimedAt: milestoneClaims.claimedAt,
      userId: users.id,
      userName: users.discordUsername,
      milestone: milestones.name,
      reward: milestones.reward,
    })
    .from(milestoneClaims)
    .innerJoin(users, eq(users.id, milestoneClaims.userId))
    .innerJoin(milestones, eq(milestones.id, milestoneClaims.milestoneId))
    .where(and(eq(milestoneClaims.status, 'claimed')))
    .orderBy(asc(milestoneClaims.claimedAt));
}
