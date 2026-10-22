/** Read models for the admin dashboard. Callers must check the staff role first. */
import 'server-only';
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/server/db';
import {
  abuseFlags,
  auditLog,
  giveaways,
  giveawayWinners,
  leaderboardResults,
  leaderboards,
  milestoneClaims,
  raffles,
  raffleWinners,
  roobetDailyWager,
  roobetLinks,
  users,
} from '@/server/db/schema';
import { dayKey } from './wagers';

export async function queueCounts() {
  const count = sql<number>`count(*)::int`;
  const [[approvals], [payouts], [prizes], [flags], [raffle], [giveaway]] = await Promise.all([
    db.select({ n: count }).from(roobetLinks).where(eq(roobetLinks.status, 'pending')),
    db.select({ n: count }).from(milestoneClaims).where(eq(milestoneClaims.status, 'claimed')),
    db
      .select({ n: count })
      .from(leaderboardResults)
      .where(and(gt(leaderboardResults.prize, 0), isNull(leaderboardResults.paidAt))),
    db.select({ n: count }).from(abuseFlags).where(eq(abuseFlags.status, 'open')),
    db.select({ n: count }).from(raffleWinners).where(and(gt(raffleWinners.prize, 0), isNull(raffleWinners.paidAt))),
    db.select({ n: count }).from(giveawayWinners).where(isNull(giveawayWinners.paidAt)),
  ]);
  return { approvals: approvals.n, payouts: payouts.n + prizes.n + raffle.n + giveaway.n, flags: flags.n };
}

export async function overviewStats() {
  const count = sql<number>`count(*)::int`;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [[all], [kick], [roobet], [month]] = await Promise.all([
    db.select({ n: count }).from(users),
    db.select({ n: count }).from(users).where(isNotNull(users.kickUserId)),
    db.select({ n: count }).from(roobetLinks).where(eq(roobetLinks.status, 'approved')),
    db
      .select({
        total: sql<number>`coalesce(sum(${roobetDailyWager.wagered}), 0)::float8`,
        players: sql<number>`count(distinct ${roobetDailyWager.roobetUid})::int`,
      })
      .from(roobetDailyWager)
      .where(gte(roobetDailyWager.day, dayKey(monthStart))),
  ]);
  return { users: all.n, kickLinked: kick.n, roobetApproved: roobet.n, monthWagered: month.total, monthPlayers: month.players };
}

/**
 * Does this username appear in STZY affiliate data? Case-insensitive, most
 * recent day first. Also reports whether that Roobet account is already
 * approved for a different member.
 */
export async function findRoobetCandidate(username: string, forUserId: string) {
  const [hit] = await db
    .select({ uid: roobetDailyWager.roobetUid, username: roobetDailyWager.username, lastDay: roobetDailyWager.day })
    .from(roobetDailyWager)
    .where(sql`lower(${roobetDailyWager.username}) = lower(${username})`)
    .orderBy(desc(roobetDailyWager.day))
    .limit(1);
  if (!hit) return null;

  const [[lifetime], [taken]] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${roobetDailyWager.wagered}), 0)::float8` })
      .from(roobetDailyWager)
      .where(eq(roobetDailyWager.roobetUid, hit.uid)),
    db
      .select({ userId: roobetLinks.userId })
      .from(roobetLinks)
      .where(and(eq(roobetLinks.roobetUid, hit.uid), eq(roobetLinks.status, 'approved'), ne(roobetLinks.userId, forUserId)))
      .limit(1),
  ]);
  return { ...hit, lifetime: lifetime.total, takenBy: taken?.userId ?? null };
}

export async function roobetLinksByStatus(status: 'pending' | 'approved' | 'rejected', limit = 100) {
  const reviewer = alias(users, 'reviewer');
  return db
    .select({
      userId: roobetLinks.userId,
      requestedUsername: roobetLinks.requestedUsername,
      roobetUid: roobetLinks.roobetUid,
      status: roobetLinks.status,
      rejectReason: roobetLinks.rejectReason,
      reviewedAt: roobetLinks.reviewedAt,
      updatedAt: roobetLinks.updatedAt,
      discordUsername: users.discordUsername,
      discordId: users.discordId,
      kickUsername: users.kickUsername,
      reviewerName: reviewer.discordUsername,
    })
    .from(roobetLinks)
    .innerJoin(users, eq(users.id, roobetLinks.userId))
    .leftJoin(reviewer, eq(reviewer.id, roobetLinks.reviewedBy))
    .where(eq(roobetLinks.status, status))
    .orderBy(status === 'pending' ? asc(roobetLinks.updatedAt) : desc(roobetLinks.reviewedAt))
    .limit(limit);
}

/** Leaderboard prizes owed: frozen/published boards, prize > 0, not yet paid. */
export async function unpaidLeaderboardPrizes() {
  return db
    .select({
      leaderboardId: leaderboardResults.leaderboardId,
      board: leaderboards.name,
      rank: leaderboardResults.rank,
      displayName: leaderboardResults.displayName,
      roobetUid: leaderboardResults.roobetUid,
      prize: leaderboardResults.prize,
      memberName: users.discordUsername,
      roobetUsername: roobetLinks.requestedUsername,
    })
    .from(leaderboardResults)
    .innerJoin(leaderboards, eq(leaderboards.id, leaderboardResults.leaderboardId))
    .leftJoin(users, eq(users.id, leaderboardResults.userId))
    .leftJoin(roobetLinks, eq(roobetLinks.userId, leaderboardResults.userId))
    .where(and(gt(leaderboardResults.prize, 0), isNull(leaderboardResults.paidAt)))
    .orderBy(desc(leaderboards.endsAt), asc(leaderboardResults.rank));
}

/** Raffle and giveaway prizes owed, with the Roobet username to tip. */
export async function unpaidDrawPrizes() {
  const [raffleRows, giveawayRows] = await Promise.all([
    db
      .select({
        drawId: raffleWinners.raffleId,
        draw: raffles.name,
        position: raffleWinners.position,
        prize: raffleWinners.prize,
        memberName: users.discordUsername,
        roobetUsername: roobetLinks.requestedUsername,
      })
      .from(raffleWinners)
      .innerJoin(raffles, eq(raffles.id, raffleWinners.raffleId))
      .innerJoin(users, eq(users.id, raffleWinners.userId))
      .leftJoin(roobetLinks, eq(roobetLinks.userId, raffleWinners.userId))
      .where(and(gt(raffleWinners.prize, 0), isNull(raffleWinners.paidAt)))
      .orderBy(asc(raffles.endsAt), asc(raffleWinners.position)),
    db
      .select({
        drawId: giveawayWinners.giveawayId,
        draw: giveaways.prize,
        position: giveawayWinners.position,
        memberName: users.discordUsername,
        kickUsername: users.kickUsername,
        roobetUsername: roobetLinks.requestedUsername,
      })
      .from(giveawayWinners)
      .innerJoin(giveaways, eq(giveaways.id, giveawayWinners.giveawayId))
      .innerJoin(users, eq(users.id, giveawayWinners.userId))
      .leftJoin(roobetLinks, eq(roobetLinks.userId, giveawayWinners.userId))
      .where(isNull(giveawayWinners.paidAt))
      .orderBy(asc(giveawayWinners.drawnAt), asc(giveawayWinners.position)),
  ]);
  return { raffleRows, giveawayRows };
}

export async function recentAudit(limit = 100) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      actorName: users.discordUsername,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
