/**
 * Stake users under the crew's code, with what each has wagered — for the
 * master admin "Stake users" page. Built from `stake_wager_days`, which the
 * leaderboard sync fills; see `recordWagerDays` in `leaderboard-sync.ts`.
 */
import 'server-only';
import { desc, max, min, sql, sum } from 'drizzle-orm';
import { crewPeriodStarts } from '@/lib/format';
import { db } from '@/server/db';
import { stakeWagerDays, users } from '@/server/db/schema';

export type StakeUserRow = {
  username: string;
  lifetime: number;
  month: number;
  week: number;
  firstDay: string;
  lastSeen: Date | null;
  /** The site member who saved this Stake username, if any. */
  member: { id: string; name: string } | null;
};

export async function getStakeUsers(now = new Date()) {
  const starts = crewPeriodStarts(now);
  const inPeriod = (from: string) =>
    sql<number>`coalesce(sum(case when ${stakeWagerDays.day} >= ${from} then ${stakeWagerDays.wagered} else 0 end), 0)`;

  const [rows, members] = await Promise.all([
    db
      .select({
        username: stakeWagerDays.username,
        lifetime: sum(stakeWagerDays.wagered).mapWith(Number),
        month: inPeriod(starts.month).mapWith(Number),
        week: inPeriod(starts.week).mapWith(Number),
        firstDay: min(stakeWagerDays.day),
        lastSeen: max(stakeWagerDays.updatedAt),
      })
      .from(stakeWagerDays)
      .groupBy(stakeWagerDays.username)
      .orderBy(desc(sum(stakeWagerDays.wagered))),
    db
      .select({
        id: users.id,
        stakeUsername: users.stakeUsername,
        stakeEuUsername: users.stakeEuUsername,
        name: sql<string>`coalesce(${users.discordGlobalName}, ${users.discordUsername})`,
      })
      .from(users)
      .where(sql`coalesce(${users.stakeUsername}, '') != '' or coalesce(${users.stakeEuUsername}, '') != ''`),
  ]);

  // Either of a member's accounts (Stake.com or Stake.eu) links the row to them.
  const memberBy = new Map(
    members.flatMap((m) =>
      [m.stakeUsername, m.stakeEuUsername]
        .filter((name): name is string => Boolean(name?.trim()))
        .map((name) => [name.trim().toLowerCase(), { id: m.id, name: m.name }] as const),
    ),
  );

  const players: StakeUserRow[] = rows.map((r) => ({
    username: r.username,
    lifetime: r.lifetime ?? 0,
    month: r.month,
    week: r.week,
    firstDay: r.firstDay ?? starts.today,
    lastSeen: r.lastSeen ? new Date(r.lastSeen) : null,
    member: memberBy.get(r.username.toLowerCase()) ?? null,
  }));

  const [tracking] = await db.select({ since: min(stakeWagerDays.day) }).from(stakeWagerDays);
  return { players, starts, trackingSince: tracking?.since ?? null };
}
