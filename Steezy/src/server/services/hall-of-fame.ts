/**
 * Hall of Fame: monthly champions, the win clubs (mega wins of 10,000x+, then
 * the 2000x, 1000x and 500x clubs, added automatically as wagers sync), and
 * community records. Members only appear by name if they left "show my name"
 * on; Roobet players who never linked an account are masked.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { giveawayWinners, leaderboardResults, leaderboards, raffleWinners, roobetDailyWager, roobetLinks, users, watchTime } from '@/server/db/schema';
import { formatMinutes, maskName } from '@/lib/format';
import { publicName } from './people';
import { handleFor } from './profiles';
import { artFor, slotArt } from './slot-art';

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
      memberId: users.id,
      kickUsername: users.kickUsername,
      discordUsername: users.discordUsername,
      telegramUsername: users.telegramUsername,
      telegramId: users.telegramId,
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
        handle: r.memberId && r.nameOnLeaderboards ? handleFor(r) : null,
      })),
  }));
}

export type HitRow = PublicPerson & {
  multiplier: number;
  gameTitle: string;
  /** Bet and payout are only shown for unlinked (masked) players or members who made wagers public. */
  wagered: number | null;
  payout: number | null;
  /** Slot artwork, when the slot has appeared in one of Steezy's bonushunt.gg hunts. */
  image: string | null;
};

type HitDbRow = {
  username: string;
  day?: string;
  hit: { multiplier?: number; wagered?: number; payout?: number; gameTitle?: string } | null;
  user_id: string | null;
  kick_username: string | null;
  discord_username: string | null;
  discord_global_name: string | null;
  telegram_username: string | null;
  telegram_name: string | null;
  telegram_id: string | null;
  name_on_leaderboards: boolean | null;
  wager_public: boolean | null;
};

/** Same privacy rules everywhere: names only for members who show them, amounts only when public. */
function toHit(r: HitDbRow, art: Map<string, string>): HitRow {
  const member = r.user_id !== null;
  const person = {
    kickUsername: r.kick_username,
    discordGlobalName: r.discord_global_name,
    discordUsername: r.discord_username,
    telegramName: r.telegram_name,
    telegramUsername: r.telegram_username,
    telegramId: r.telegram_id,
    nameOnLeaderboards: true,
  };
  const named = member && r.name_on_leaderboards;
  const showAmounts = !member || Boolean(r.wager_public);
  return {
    name: named
      ? publicName(person)
      : maskName(r.username),
    handle: named ? handleFor(person) : null,
    multiplier: r.hit!.multiplier!,
    gameTitle: r.hit!.gameTitle ?? 'Unknown game',
    wagered: showAmounts ? (r.hit!.wagered ?? null) : null,
    payout: showAmounts ? (r.hit!.payout ?? null) : null,
    image: artFor(art, r.hit!.gameTitle),
  };
}

/**
 * Win clubs, biggest first. Each is a band up to the next club's floor, so a
 * hit only shows in the highest club it reached.
 */
export const CLUBS = [
  { key: 'mega', title: 'Mega wins', min: 10000, max: null },
  { key: '2000', title: 'The 2,000× club', min: 2000, max: 10000 },
  { key: '1000', title: 'The 1,000× club', min: 1000, max: 2000 },
  { key: '500', title: 'The 500× club', min: 500, max: 1000 },
] as const;

/**
 * Every hit in [min, max), newest day first. Roobet only reports each player's
 * best multiplier per synced day, so this is at most one hit per player per day.
 */
export async function clubWins(min: number, max: number | null, limit = 30): Promise<(HitRow & { day: string })[]> {
  const art = await slotArt();
  const m = sql`(d.highest_multiplier->>'multiplier')::float8`;
  const rows = await db.execute(sql`
    select
      d.username, d.day::text as day, d.highest_multiplier as hit,
      u.id as user_id, u.kick_username, u.discord_username, u.discord_global_name,
      u.telegram_username, u.telegram_name, u.telegram_id, u.name_on_leaderboards, u.wager_public
    from ${roobetDailyWager} d
    left join ${roobetLinks} l on l.roobet_uid = d.roobet_uid and l.status = 'approved'
    left join ${users} u on u.id = l.user_id
    where ${m} >= ${min} ${max === null ? sql`` : sql`and ${m} < ${max}`} and (u.blocked_from_rewards is not true)
    order by d.day desc, ${m} desc
    limit ${limit}
  `);
  return (rows.rows as HitDbRow[]).map((r) => ({ ...toHit(r, art), day: r.day! }));
}

export type RecordRow = { label: string; person: PublicPerson; value: string };

/** One leader per record, among members who show their name. */
export async function records(): Promise<RecordRow[]> {
  const person = {
    id: users.id,
    kickUsername: users.kickUsername,
    discordUsername: users.discordUsername,
    discordGlobalName: users.discordGlobalName,
    telegramName: users.telegramName,
    telegramUsername: users.telegramUsername,
    telegramId: users.telegramId,
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
      select u.id, u.kick_username, u.discord_username, u.discord_global_name, u.telegram_name, u.telegram_username, u.telegram_id, count(*)::int as n
      from (select user_id from ${raffleWinners} union all select user_id from ${giveawayWinners}) w
      join ${users} u on u.id = w.user_id
      where u.name_on_leaderboards and not u.blocked_from_rewards
      group by u.id order by n desc limit 1
    `),
  ]);

  type PersonRow = {
    kickUsername: string | null;
    discordUsername: string | null;
    discordGlobalName: string | null;
    telegramName: string | null;
    telegramUsername: string | null;
    telegramId: string | null;
  };
  const toPerson = (p: PersonRow): PublicPerson => ({
    name: publicName({ ...p, nameOnLeaderboards: true }),
    handle: handleFor(p),
  });
  const out: RecordRow[] = [];
  if (watch[0]?.n) out.push({ label: 'Most watch time', person: toPerson(watch[0]), value: `${formatMinutes(watch[0].n)} watched` });
  if (streams[0]?.n) out.push({ label: 'Most streams', person: toPerson(streams[0]), value: `${streams[0].n} attended` });
  if (titles[0]?.n) out.push({ label: 'Most titles', person: toPerson(titles[0]), value: `${titles[0].n} monthly win${titles[0].n === 1 ? '' : 's'}` });
  type DrawRow = {
    kick_username: string | null;
    discord_username: string | null;
    discord_global_name: string | null;
    telegram_name: string | null;
    telegram_username: string | null;
    telegram_id: string | null;
    n: number;
  };
  const d = (draws.rows as DrawRow[])[0];
  if (d?.n) {
    out.push({
      label: 'Luckiest',
      person: toPerson({
        kickUsername: d.kick_username,
        discordUsername: d.discord_username,
        discordGlobalName: d.discord_global_name,
        telegramName: d.telegram_name,
        telegramUsername: d.telegram_username,
        telegramId: d.telegram_id,
      }),
      value: `${d.n} raffle & giveaway win${d.n === 1 ? '' : 's'}`,
    });
  }
  return out;
}
