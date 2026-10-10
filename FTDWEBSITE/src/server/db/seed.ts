/**
 * The starting state of a brand new FGDR database.
 *
 * Only things that are true go in here: who the creators are, and the VIP
 * reward ladder the crew has committed to. There is deliberately no sample
 * content -- no clips, wins, raffles or giveaway totals -- because this seed
 * runs on the live site, and a fabricated win or a giveaway total nobody paid
 * out is a claim the site would be making to real visitors.
 *
 * Everything else is entered through the admin area, and the pages are built
 * to show an honest empty state until it is.
 *
 * The leaderboard is not seeded at all: the standings, prize pool and totals
 * are owned by the affiliate sheet and written by the sync on boot.
 *
 *   npm run db:setup      (push schema + seed)
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as s from './schema';

/** The homepage background video. */
const HERO_BACKGROUND =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4';

/* ------------------------------------------------------------------ people */

export const streamers: (typeof s.streamers.$inferInsert)[] = [
  {
    id: 'fatguysdontrun',
    chapterTitle: 'The main event',
    quote: "King of the chaos. 🐻🔥",
    specialty: 'Bonus hunts & community sessions',
    displayName: 'FatGuysDontRun',
    monogram: 'FG',
    role: 'Founder · Main channel',
    tagline: "King of the chaos. 🐻🔥",
    bio: "FatGuysDontRun takes over the high-stakes casino—slots spinning, chips stacked, and the bear running the show. Big plays. Bigger energy. No fear.",
    accent: 'gold',
    sortOrder: 1,
    isPrimary: true,
    kickUsername: 'fatguysdontrun',
    kickUrl: 'https://www.kick.com/fatguysdontrun',
  },
  {
    id: 'insanetigers7',
    chapterTitle: 'The wild card',
    quote: "Built for the chaos. 🐅🎰",
    specialty: 'Late-night slots & viewer picks',
    displayName: 'Insane Tigers 7',
    monogram: 'IT',
    role: 'Slots · Viewer picks',
    tagline: "Built for the chaos. 🐅🎰",
    bio: "A tiger ruling the casino floor—surrounded by slots, chips, dice, and high-stakes energy. Play smart. Play big. Stay dangerous.",
    accent: 'cyan',
    sortOrder: 2,
    kickUsername: 'insanetigers7',
    kickUrl: 'https://www.kick.com/insanetigers7',
  },
  {
    id: 'stillmakinggains',
    chapterTitle: 'The strategist',
    quote: "Still Making Gains. 🐍💰",
    specialty: 'Bankroll discipline & leaderboard strategy',
    displayName: 'Still Making Gains',
    monogram: 'SG',
    role: 'The grinder',
    tagline: "Still Making Gains. 🐍💰",
    bio: "A king cobra ruling the casino floor—high stakes, bigger plays, and a relentless grind. Stay disciplined. Play smart. Keep making gains.",
    accent: 'steel',
    sortOrder: 3,
    kickUsername: 'stillmakinggains',
    kickUrl: 'https://www.kick.com/stillmakinggains',
  },
  {
    id: 'dallasghost',
    chapterTitle: 'The phantom',
    quote: "DallasGhost has entered the casino. 💀🟢",
    specialty: 'Blackjack & table games',
    displayName: 'Dallas Ghost',
    monogram: 'DG',
    role: 'Tables · Late night',
    tagline: "DallasGhost has entered the casino. 💀🟢",
    bio: "From the shadows comes the Reaper—high stakes, cold decisions, and no fear. Same grind. Different payouts.",
    accent: 'ruby',
    sortOrder: 4,
    kickUsername: 'dallasghost',
    kickUrl: 'https://www.kick.com/dallasghost',
  },
  {
    id: 'daddykonggaming',
    chapterTitle: 'The heavyweight',
    quote: 'Big bets, bigger giveaways. 🦍🔴',
    specialty: 'Bonus buys & viewer giveaways',
    displayName: 'DaddyKong Gaming',
    monogram: 'DK',
    role: 'Slots · Giveaways',
    tagline: 'Big bets, bigger giveaways. 🦍🔴',
    bio: 'The gorilla in the high-limit room — heavy stakes, heavier reactions, and a habit of handing the winnings straight back to chat.',
    accent: 'ruby',
    sortOrder: 5,
    avatarUrl: '/brand/daddykonggaming.png',
    kickUsername: 'daddykonggaming',
    kickUrl: 'https://kick.com/daddykonggaming',
  },
];

/* ------------------------------------------------------- VIP reward ladder */

const milestones: (typeof s.milestones.$inferInsert)[] = [
  { id: 'ms-starter', name: 'Starter', threshold: 5000, cashReward: 5, reward: '$5 cash reward', perk: '', sortOrder: 1 },
  { id: 'ms-rookie', name: 'Rookie', threshold: 10000, cashReward: 10, reward: '$10 cash reward', perk: '', sortOrder: 2 },
  { id: 'ms-bronze', name: 'Bronze', threshold: 25000, cashReward: 25, reward: '$25 cash reward', perk: '', sortOrder: 3 },
  { id: 'ms-silver', name: 'Silver', threshold: 50000, cashReward: 50, reward: '$50 cash reward', perk: '', sortOrder: 4 },
  { id: 'ms-gold', name: 'Gold', threshold: 100000, cashReward: 100, reward: '$100 cash reward', perk: 'Your own VIP host in the FGDR Discord', sortOrder: 5 },
  { id: 'ms-platinum', name: 'Platinum', threshold: 250000, cashReward: 250, reward: '$250 cash reward', perk: '', sortOrder: 6 },
  { id: 'ms-diamond', name: 'Diamond', threshold: 500000, cashReward: 500, reward: '$500 cash reward', perk: '', sortOrder: 7 },
  { id: 'ms-master', name: 'Master', threshold: 750000, cashReward: 750, reward: '$750 cash reward', perk: '', sortOrder: 8 },
  { id: 'ms-elite', name: 'Elite', threshold: 1000000, cashReward: 1000, reward: '$1,000 cash reward', perk: '', sortOrder: 9 },
  { id: 'ms-champion', name: 'Champion', threshold: 1500000, cashReward: 1500, reward: '$1,500 cash reward', perk: '', sortOrder: 10 },
  { id: 'ms-legend', name: 'Legend', threshold: 2000000, cashReward: 2000, reward: '$2,000 cash reward', perk: '', sortOrder: 11 },
  { id: 'ms-immortal', name: 'Immortal', threshold: 5000000, cashReward: 5000, reward: '$5,000 cash reward', perk: '', sortOrder: 12 },
];

/* -------------------------------------------------------------------------- */

export async function seedDatabase({ ifEmpty = false } = {}) {
  const client = createClient({
    url: process.env.DATABASE_URL ?? 'file:./fgdr.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema: s });

  if (ifEmpty) {
    // See bootstrap.ts: `site_settings` is the sentinel, not `streamers`, since a
    // data migration can add a channel to a database that has no content yet.
    const existing = await client.execute('select count(*) as n from site_settings').catch(() => null);
    if (existing && Number(existing.rows[0].n) > 0) {
      console.log('FGDR seed skipped -- the database already has content.');
      client.close();
      return false;
    }
  }

  /*
   * Content tables are replaced wholesale; member accounts are never touched.
   * Run without `--if-empty` and this resets the site to its launch state,
   * which is how the sample content was cleared before the domain went live.
   */
  await db.delete(s.giveaways);
  await db.delete(s.pastStreams);
  await db.delete(s.clips);
  await db.delete(s.wins);
  await db.delete(s.leaderboardEntries);
  await db.delete(s.leaderboardBoards);
  await db.delete(s.raffles);
  await db.delete(s.challenges);
  await db.delete(s.milestones);
  await db.delete(s.announcements);
  await db.delete(s.activity);
  await db.delete(s.communityStats);
  await db.delete(s.bonusHuntBonuses);
  await db.delete(s.bonusHunts);
  await db.delete(s.streamers);
  await db.delete(s.siteSettings);

  await db.insert(s.streamers).values(streamers);
  await db.insert(s.milestones).values(milestones);

  await db.insert(s.siteSettings).values({
    id: 'default',
    heroTagline: 'One crew. Every creator. One community.',
    heroVideoUrl: HERO_BACKGROUND,
    heroPosterUrl: '/brand/hero2-poster.jpg',
  });

  console.log('FGDR seed complete:', { streamers: streamers.length, milestones: milestones.length });
  client.close();
  return true;
}

// Still runnable straight from the command line: `npm run db:seed`.
if (process.argv[1] && /seed\.[tj]s$/.test(process.argv[1])) {
  seedDatabase({ ifEmpty: process.argv.includes('--if-empty') }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
