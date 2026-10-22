/**
 * Hall of Fame: monthly champions, biggest multipliers under code STZY, and
 * community records. Members only appear by name if they left "show my name"
 * on; Roobet players who never linked an account are masked.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { giveawayWinners, leaderboardResults, leaderboards, raffleWinners, roobetDailyWager, roobetLinks, users, watchTime } from '@/server/db/schema';
import { formatMinutes, maskName } from '@/lib/format';
import { publicName } from './people';
import { handleFor } from './profiles';

type PublicPerson = { name: string; handle: string | null };

/** Champions of the most recent finished boards, with their top 3. */
export async function champions(limit = 8) {
  const boards = await db
    .select()
    .from(leaderboards)
    .where(inArray(leaderboards.status, ['frozen', 'published']))
    .orderBy(desc(leaderboards.endsAt))
    .limit(limit);
  if (!boards.length) return [];
  const rows = await db
    .select({
      leaderboardId: leaderboardResults.leaderboardId,
      rank: leaderboardResults.rank,
      displayName: leaderboardResults.displayName,
      prize: leaderboardResults.prize,
      kickUsername: users.kickUsername,
      discordUsername: users.discordUsername,
      nameOnLeaderboards: users.nameOnLeaderboards,
    })
    .from(leaderboardResults)
    .leftJoin(users, eq(users.id, leaderboardResults.userId))
    .where(and(inArray(leaderboardResults.leaderboardId, boards.map((b) => b.id)), sql`${leaderboardResults.rank} <= 3`))
    .orderBy(asc(leaderboardResults.rank));
  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    pool: b.prizes.reduce((s, p) => s + p, 0),
    podium: rows
      .filter((r) => r.leaderboardId === b.id)
      .map((r) => ({
        rank: r.rank,
        prize: r.prize,
        name: r.displayName,
        // Only link a profile when the frozen name is the member's real (unmasked) name.
        handle: r.discordUsername && r.nameOnLeaderboards ? handleFor({ kickUsername: r.kickUsername, discordUsername: r.discordUsername }) : null,
      })),
  }));
}

export type HitRow = PublicPerson & {
  multiplier: number;
  gameTitle: string;
  /** Bet and payout are only shown for unlinked (masked) players or members who made wagers public. */
  wagered: number | null;
  payout: number | null;
};

/** Each player's best multiplier, highest first. */
export async function biggestHits(limit = 10): Promise<HitRow[]> {
  const rows = await db.execute(sql`
    select distinct on (d.roobet_uid)
      d.roobet_uid, d.username, d.highest_multiplier as hit,
      u.kick_username, u.discord_username, u.discord_global_name, u.name_on_leaderboards, u.wager_public
    from ${roobetDailyWager} d
    left join ${roobetLinks} l on l.roobet_uid = d.roobet_uid and l.status = 'approved'
    left join ${users} u on u.id = l.user_id
    where d.highest_multiplier is not null and (u.blocked_from_rewards is not true)
    order by d.roobet_uid, (d.highest_multiplier->>'multiplier')::float8 desc nulls last
  `);
  type Row = {
    username: string;
    hit: { multiplier?: number; wagered?: number; payout?: number; gameTitle?: string } | null;
    kick_username: string | null;
    discord_username: string | null;
    discord_global_name: string | null;
    name_on_leaderboards: boolean | null;
    wager_public: boolean | null;
  };
  return (rows.rows as Row[])
    .filter((r) => r.hit?.multiplier)
    .map((r) => {
      const member = r.discord_username !== null;
      const named = member && r.name_on_leaderboards;
      const showAmounts = !member || Boolean(r.wager_public);
      return {
        name: named
          ? publicName({ kickUsername: r.kick_username, discordGlobalName: r.discord_global_name, discordUsername: r.discord_username!, nameOnLeaderboards: true })
          : maskName(r.username),
        handle: named ? handleFor({ kickUsername: r.kick_username, discordUsername: r.discord_username! }) : null,
        multiplier: r.hit!.multiplier!,
        gameTitle: r.hit!.gameTitle ?? 'Unknown game',
        wagered: showAmounts ? (r.hit!.wagered ?? null) : null,
        payout: showAmounts ? (r.hit!.payout ?? null) : null,
      };
    })
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, limit);
}

export type RecordRow = { label: string; person: PublicPerson; value: string };

/** One leader per record, among members who show their name. */
export async function records(): Promise<RecordRow[]> {
  const person = {
    id: users.id,
    kickUsername: users.kickUsername,
    discordUsername: users.discordUsername,
    discordGlobalName: users.discordGlobalName,
    nameOnLeaderboards: users.nameOnLeaderboards,
  };
  const visible = and(eq(users.nameOnLeaderboards, true), eq(users.blockedFromRewards, false));

  const [watch, streams, titles, draws] = await Promise.all([
    db
      .select({ ...person, n: sql<number>`sum(${watchTime.minutes})::int` })
      .from(watchTime)
      .innerJoin(users, eq(users.id, watchTime.userId))
      .where(visible)
      .groupBy(users.id)
      .orderBy(sql`2 desc`)
      .limit(1),
    db
      .select({ ...person, n: sql<number>`count(*) filter (where ${watchTime.minutes} > 0)::int` })
      .from(watchTime)
      .innerJoin(users, eq(users.id, watchTime.userId))
      .where(visible)
      .groupBy(users.id)
      .orderBy(sql`count(*) filter (where ${watchTime.minutes} > 0) desc`)
      .limit(1),
    db
      .select({ ...person, n: sql<number>`count(*)::int` })
      .from(leaderboardResults)
      .innerJoin(users, eq(users.id, leaderboardResults.userId))
      .where(and(visible, eq(leaderboardResults.rank, 1)))
      .groupBy(users.id)
      .orderBy(sql`count(*) desc`)
      .limit(1),
    db.execute(sql`
      select u.id, u.kick_username, u.discord_username, u.discord_global_name, count(*)::int as n
      from (select user_id from ${raffleWinners} union all select user_id from ${giveawayWinners}) w
      join ${users} u on u.id = w.user_id
      where u.name_on_leaderboards and not u.blocked_from_rewards
      group by u.id order by n desc limit 1
    `),
  ]);

  const toPerson = (p: { kickUsername: string | null; discordUsername: string; discordGlobalName: string | null }): PublicPerson => ({
    name: publicName({ ...p, nameOnLeaderboards: true }),
    handle: handleFor(p),
  });
  const out: RecordRow[] = [];
  if (watch[0]?.n) out.push({ label: 'Most watch time', person: toPerson(watch[0]), value: `${formatMinutes(watch[0].n)} watched` });
  if (streams[0]?.n) out.push({ label: 'Most streams', person: toPerson(streams[0]), value: `${streams[0].n} attended` });
  if (titles[0]?.n) out.push({ label: 'Most titles', person: toPerson(titles[0]), value: `${titles[0].n} monthly win${titles[0].n === 1 ? '' : 's'}` });
  const d = (draws.rows as { kick_username: string | null; discord_username: string; discord_global_name: string | null; n: number }[])[0];
  if (d?.n) {
    out.push({
      label: 'Luckiest',
      person: toPerson({ kickUsername: d.kick_username, discordUsername: d.discord_username, discordGlobalName: d.discord_global_name }),
      value: `${d.n} raffle & giveaway win${d.n === 1 ? '' : 's'}`,
    });
  }
  return out;
}
