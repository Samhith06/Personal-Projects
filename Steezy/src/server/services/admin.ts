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
import { fetchRoobetStats, type RoobetRow } from '@/server/roobet/client';
import { roobetConfigFromEnv } from '@/server/roobet/sync';

export async function queueCounts() {
  const count = sql<number>`count(*)::int`;
  const [[approvals], [payouts], [prizes], [flags], [raffle], [giveaway]] = await Promise.all([
    db.select({ n: count }).from(roobetLinks).where(eq(roobetLinks.status, 'pending')),
    db.select({ n: count }).from(milestoneClaims).where(eq(milestoneClaims.status, 'claimed')),
    db
      .select({ n: count })
      .from(leaderboardResults)
      .where(and(gt(leaderboardResults.prize, 0), isNull(leaderboardResults.paidAt), isNull(leaderboardResults.deniedAt))),
    db.select({ n: count }).from(abuseFlags).where(eq(abuseFlags.status, 'open')),
    db.select({ n: count }).from(raffleWinners).where(and(gt(raffleWinners.prize, 0), isNull(raffleWinners.paidAt), isNull(raffleWinners.deniedAt))),
    db.select({ n: count }).from(giveawayWinners).where(and(isNull(giveawayWinners.paidAt), isNull(giveawayWinners.deniedAt))),
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
        weighted: sql<number>`coalesce(sum(${roobetDailyWager.weightedWagered}), 0)::float8`,
        players: sql<number>`count(distinct ${roobetDailyWager.roobetUid})::int`,
      })
      .from(roobetDailyWager)
      .where(gte(roobetDailyWager.day, dayKey(monthStart))),
  ]);
  return { users: all.n, kickLinked: kick.n, roobetApproved: roobet.n, monthWagered: month.total, monthWeighted: month.weighted, monthPlayers: month.players };
}

/**
 * Does this username appear in STZY affiliate data? Case-insensitive, most
 * recent day first. Also reports whether that Roobet account is already
 * approved for a different member.
 */
/** How far back the Roobet fallback looks for a referred player. */
const LOOKBACK_FROM = new Date('2023-01-01T00:00:00Z');
let referredCache: { at: number; rows: RoobetRow[] } | null = null;

/**
 * Every player Roobet reports under STZY since LOOKBACK_FROM, for usernames
 * that haven't wagered inside the days we've synced. Cached for 10 minutes so
 * the approvals page doesn't hit Roobet once per row.
 */
async function referredPlayers(): Promise<RoobetRow[]> {
  if (referredCache && Date.now() - referredCache.at < 10 * 60_000) return referredCache.rows;
  const config = roobetConfigFromEnv();
  if (!config) return [];
  try {
    const rows = await fetchRoobetStats(config, LOOKBACK_FROM, new Date());
    referredCache = { at: Date.now(), rows };
    return rows;
  } catch (error) {
    console.warn('[approvals] Roobet lookup failed', error);
    return referredCache?.rows ?? [];
  }
}

export async function findRoobetCandidate(username: string, forUserId: string) {
  const [synced] = await db
    .select({ uid: roobetDailyWager.roobetUid, username: roobetDailyWager.username })
    .from(roobetDailyWager)
    .where(sql`lower(${roobetDailyWager.username}) = lower(${username})`)
    .orderBy(desc(roobetDailyWager.day))
    .limit(1);
  // Not in the synced days: ask Roobet directly (players who signed up under STZY but haven't wagered lately).
  const remote = synced ? null : (await referredPlayers()).find((r) => r.username.toLowerCase() === username.toLowerCase());
  const hit = synced ?? (remote ? { uid: remote.uid, username: remote.username } : null);
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
  return { ...hit, lifetime: remote ? remote.wagered : lifetime.total, takenBy: taken?.userId ?? null };
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
    .where(and(gt(leaderboardResults.prize, 0), isNull(leaderboardResults.paidAt), isNull(leaderboardResults.deniedAt)))
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
      .where(and(gt(raffleWinners.prize, 0), isNull(raffleWinners.paidAt), isNull(raffleWinners.deniedAt)))
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
      .where(and(isNull(giveawayWinners.paidAt), isNull(giveawayWinners.deniedAt)))
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

export const MEMBER_FILTERS = ['all', 'roobet', 'pending', 'unlinked', 'kick', 'staff', 'blocked'] as const;
export const MEMBER_SORTS = ['recent', 'joined', 'name', 'wager', 'watch'] as const;
export type MemberFilter = (typeof MEMBER_FILTERS)[number];
export type MemberSort = (typeof MEMBER_SORTS)[number];

export type MemberRow = {
  id: string;
  discordUsername: string;
  discordGlobalName: string | null;
  kickUsername: string | null;
  role: string;
  blocked: boolean;
  createdAt: Date;
  lastSeenAt: Date;
  roobetStatus: string | null;
  roobetUsername: string | null;
  /** Lifetime weighted wager under an approved link; null without one. */
  weighted: number | null;
  watchMinutes: number;
  referredBy: string | null;
};

const FILTER_SQL: Record<MemberFilter, ReturnType<typeof sql>> = {
  all: sql`true`,
  roobet: sql`l.status = 'approved'`,
  pending: sql`l.status = 'pending'`,
  unlinked: sql`l.user_id is null`,
  kick: sql`u.kick_user_id is not null`,
  staff: sql`u.role <> 'member'`,
  blocked: sql`u.blocked_from_rewards`,
};

const SORT_SQL: Record<MemberSort, ReturnType<typeof sql>> = {
  recent: sql`u.last_seen_at desc`,
  joined: sql`u.created_at desc`,
  name: sql`lower(u.discord_username) asc`,
  wager: sql`weighted desc nulls last`,
  watch: sql`watch_minutes desc`,
};

/** The staff member list: search by Discord, Kick or Roobet name, filter, sort, page. */
export async function searchMembers(opts: { query?: string; filter: MemberFilter; sort: MemberSort; limit: number; offset: number }) {
  const q = opts.query?.trim() ? `%${opts.query.trim().toLowerCase()}%` : null;
  const where = sql`${FILTER_SQL[opts.filter]} and (${q}::text is null
    or lower(u.discord_username) like ${q} or lower(coalesce(u.discord_global_name, '')) like ${q}
    or lower(coalesce(u.kick_username, '')) like ${q} or lower(coalesce(l.requested_username, '')) like ${q} or lower(coalesce(u.referred_by, '')) like ${q})`;

  const [rows, [{ total }]] = await Promise.all([
    db.execute(sql`
      select u.id, u.discord_username, u.discord_global_name, u.kick_username, u.role, u.blocked_from_rewards,
        u.created_at, u.last_seen_at, u.referred_by, l.status as roobet_status, l.requested_username as roobet_username,
        (select sum(d.weighted_wagered)::float8 from ${roobetDailyWager} d where l.status = 'approved' and d.roobet_uid = l.roobet_uid) as weighted,
        coalesce((select sum(w.minutes)::int from watch_time w where w.user_id = u.id), 0) as watch_minutes
      from ${users} u
      left join ${roobetLinks} l on l.user_id = u.id
      where ${where}
      order by ${SORT_SQL[opts.sort]}, u.created_at desc
      limit ${opts.limit} offset ${opts.offset}
    `),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(sql`${users} u left join ${roobetLinks} l on l.user_id = u.id`)
      .where(where),
  ]);

  type Raw = {
    id: string;
    discord_username: string;
    discord_global_name: string | null;
    kick_username: string | null;
    role: string;
    blocked_from_rewards: boolean;
    created_at: string | Date;
    last_seen_at: string | Date;
    roobet_status: string | null;
    roobet_username: string | null;
    weighted: number | null;
    watch_minutes: number;
    referred_by: string | null;
  };
  const members: MemberRow[] = (rows.rows as Raw[]).map((r) => ({
    id: r.id,
    discordUsername: r.discord_username,
    discordGlobalName: r.discord_global_name,
    kickUsername: r.kick_username,
    role: r.role,
    blocked: r.blocked_from_rewards,
    createdAt: new Date(r.created_at),
    lastSeenAt: new Date(r.last_seen_at),
    roobetStatus: r.roobet_status,
    roobetUsername: r.roobet_username,
    weighted: r.roobet_status === 'approved' ? Number(r.weighted ?? 0) : null,
    watchMinutes: r.watch_minutes,
    referredBy: r.referred_by,
  }));
  return { members, total };
}
