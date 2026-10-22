/**
 * Starting configuration: milestone tiers, badges and this month's leaderboard,
 * using the defaults from the SteezeSpins Home design. Only fills empty tables,
 * so it's safe to run on every deploy: `npm run db:seed`.
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './index';
import { badges, leaderboards, milestones } from './schema';

const TIERS: [string, number, number][] = [
  ['Newbie', 1_000, 5],
  ['Beginner', 5_000, 10],
  ['Rookie', 10_000, 25],
  ['Hustler', 25_000, 50],
  ['Grinder', 50_000, 100],
  ['High Roller', 100_000, 150],
  ['Whale', 250_000, 400],
  ['Legend', 500_000, 1_000],
];

const BADGES = [
  { key: 'new', name: 'New', rule: { maxAccountAgeDays: 14 }, sortOrder: 30 },
  { key: 'regular', name: 'Regular', rule: { minStreams30d: 8 }, sortOrder: 20 },
  { key: 'vip', name: 'VIP', rule: null, sortOrder: 10 },
];

const PRIZES = [1200, 700, 400, 250, 150, 60, 60, 60, 60, 60];

async function isEmpty(table: typeof milestones | typeof badges | typeof leaderboards) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return n === 0;
}

async function main() {
  if (await isEmpty(milestones)) {
    await db.insert(milestones).values(TIERS.map(([name, threshold, reward]) => ({ name, threshold, reward })));
    console.log(`[seed] ${TIERS.length} milestone tiers`);
  }
  if (await isEmpty(badges)) {
    await db.insert(badges).values(BADGES);
    console.log(`[seed] ${BADGES.length} badges`);
  }
  if (await isEmpty(leaderboards)) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
    const name = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    await db.insert(leaderboards).values({ name, startsAt: start, endsAt: end, prizes: PRIZES, status: 'live' });
    console.log(`[seed] live leaderboard "${name}" ($3,000)`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
