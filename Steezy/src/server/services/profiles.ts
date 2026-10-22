/**
 * Public member profiles (/u/<handle>) and badges.
 *
 * Handle = the member's Kick username if linked (that's who chat knows), else
 * their Discord username. Members who turned off "show my name" have no public
 * profile at all. Wager amounts and payouts only appear when the member opted in
 * (`wagerPublic`); ranks, watch time and wins are always shown.
 */
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  badges,
  giveaways,
  giveawayWinners,
  leaderboardResults,
  leaderboards,
  milestoneClaims,
  milestones,
  raffles,
  raffleWinners,
  roobetDailyWager,
  streamSessions,
  userBadges,
  users,
  watchTime,
  type User,
} from '@/server/db/schema';
import { discordAccountCreatedAt } from '@/lib/discord';
import { approvedRoobetUid } from './wagers';
import { watchTotals } from '@/server/kick/watchtime';

export const handleFor = (u: Pick<User, 'kickUsername' | 'discordUsername'>) => (u.kickUsername || u.discordUsername).toLowerCase();
export const profilePath = (u: Pick<User, 'kickUsername' | 'discordUsername'>) => `/u/${encodeURIComponent(handleFor(u))}`;

/** Find a member by handle; null if missing or private. Kick names win over Discord names. */
export async function findByHandle(handle: string) {
  const h = handle.toLowerCase();
  const [byKick] = await db.select().from(users).where(sql`lower(${users.kickUsername}) = ${h}`).limit(1);
  const user =
    byKick ??
    (await db
      .select()
      .from(users)
      .where(and(sql`lower(${users.discordUsername}) = ${h}`, sql`${users.kickUsername} is null`))
      .limit(1))[0];
  if (!user || !user.nameOnLeaderboards) return null;
  return user;
}

export type Badge = { key: string; name: string; tone: 'warn' | 'accent' | 'neutral' };

/**
 * Badges, evaluated on read:
 *   VIP      granted by staff (user_badges)
 *   Regular  8+ streams attended in the last 30 days
 *   New      Discord-site account under 14 days old
 * Any other staff-granted badges are listed after these.
 */
export async function badgesFor(user: User): Promise<Badge[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [[recent], granted] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(watchTime)
      .innerJoin(streamSessions, eq(streamSessions.id, watchTime.sessionId))
      .where(and(eq(watchTime.userId, user.id), sql`${watchTime.minutes} > 0`, gte(streamSessions.startedAt, since))),
    db
      .select({ key: badges.key, name: badges.name })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, user.id))
      .orderBy(badges.sortOrder),
  ]);
  const out: Badge[] = [];
  if (granted.some((b) => b.key === 'vip')) out.push({ key: 'vip', name: 'VIP', tone: 'warn' });
  if (recent.n >= 8) out.push({ key: 'regular', name: 'Regular', tone: 'accent' });
  if (Date.now() - user.createdAt.getTime() < 14 * 86_400_000) out.push({ key: 'new', name: 'New', tone: 'neutral' });
  for (const b of granted) if (!['vip', 'regular', 'new'].includes(b.key)) out.push({ key: b.key, name: b.name, tone: 'neutral' });
  return out;
}

export type Trophy = { title: string; when: Date; prize: number | null; kind: 'leaderboard' | 'raffle' | 'giveaway' | 'milestone' };

export async function profileView(user: User) {
  const uid = await approvedRoobetUid(user.id);
  const [badgeList, watch, finishes, raffleWins, giveawayWins, milestoneRows, bestHit] = await Promise.all([
    badgesFor(user),
    watchTotals(user.id),
    db
      .select({
        board: leaderboards.name,
        endsAt: leaderboards.endsAt,
        rank: leaderboardResults.rank,
        wagered: leaderboardResults.wagered,
        prize: leaderboardResults.prize,
      })
      .from(leaderboardResults)
      .innerJoin(leaderboards, eq(leaderboards.id, leaderboardResults.leaderboardId))
      .where(eq(leaderboardResults.userId, user.id))
      .orderBy(desc(leaderboards.endsAt))
      .limit(12),
    db
      .select({ name: raffles.name, at: raffles.drawnAt, position: raffleWinners.position, prize: raffleWinners.prize })
      .from(raffleWinners)
      .innerJoin(raffles, eq(raffles.id, raffleWinners.raffleId))
      .where(eq(raffleWinners.userId, user.id)),
    db
      .select({ prize: giveaways.prize, at: giveaways.drawnAt })
      .from(giveawayWinners)
      .innerJoin(giveaways, eq(giveaways.id, giveawayWinners.giveawayId))
      .where(eq(giveawayWinners.userId, user.id)),
    db
      .select({ name: milestones.name, reward: milestones.reward, at: milestoneClaims.claimedAt })
      .from(milestoneClaims)
      .innerJoin(milestones, eq(milestones.id, milestoneClaims.milestoneId))
      .where(and(eq(milestoneClaims.userId, user.id), inArray(milestoneClaims.status, ['claimed', 'paid']))),
    uid ? bestMultiplierFor(uid) : Promise.resolve(null),
  ]);

  const trophies: Trophy[] = [
    ...finishes.filter((f) => f.prize > 0).map((f) => ({ title: `${f.board} leaderboard · #${f.rank}`, when: f.endsAt, prize: f.prize, kind: 'leaderboard' as const })),
    ...raffleWins.map((r) => ({ title: `${r.name} · #${r.position}`, when: r.at ?? new Date(0), prize: r.prize, kind: 'raffle' as const })),
    ...giveawayWins.map((g) => ({ title: `Giveaway: ${g.prize}`, when: g.at ?? new Date(0), prize: null, kind: 'giveaway' as const })),
    ...milestoneRows.map((m) => ({ title: `${m.name} milestone`, when: m.at, prize: m.reward, kind: 'milestone' as const })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  const prizeTotal =
    finishes.reduce((s, f) => s + f.prize, 0) + raffleWins.reduce((s, r) => s + r.prize, 0) + milestoneRows.reduce((s, m) => s + m.reward, 0);
  const bestFinish = finishes.length ? Math.min(...finishes.map((f) => f.rank)) : null;
  const titles = finishes.filter((f) => f.rank === 1).length;

  return {
    badges: badgeList,
    watch,
    finishes,
    trophies,
    prizeTotal,
    bestFinish,
    titles,
    bestHit,
    linkedRoobet: Boolean(uid),
    discordCreated: discordAccountCreatedAt(user.discordId),
  };
}

export type Hit = { multiplier: number; wagered: number; payout: number; gameTitle: string; day: string };

/** A Roobet account's best multiplier on record (Roobet reports the best per day). */
export async function bestMultiplierFor(roobetUid: string): Promise<Hit | null> {
  const [row] = await db
    .select({ hit: roobetDailyWager.highestMultiplier, day: roobetDailyWager.day })
    .from(roobetDailyWager)
    .where(and(eq(roobetDailyWager.roobetUid, roobetUid), sql`${roobetDailyWager.highestMultiplier} is not null`))
    .orderBy(sql`(${roobetDailyWager.highestMultiplier}->>'multiplier')::float8 desc nulls last`)
    .limit(1);
  const hit = row?.hit as Partial<Hit> | null | undefined;
  if (!hit?.multiplier) return null;
  return { multiplier: hit.multiplier, wagered: hit.wagered ?? 0, payout: hit.payout ?? 0, gameTitle: hit.gameTitle ?? 'Unknown game', day: row.day };
}
