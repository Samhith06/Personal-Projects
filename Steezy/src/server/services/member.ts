/** Read models for the member's own pages. */
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { roobetLinks, watchTime } from '@/server/db/schema';
import { wagerTotalFor } from './wagers';

export async function getRoobetLink(userId: string) {
  const [row] = await db.select().from(roobetLinks).where(eq(roobetLinks.userId, userId)).limit(1);
  return row ?? null;
}

/** First day of the current month, UTC. */
function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMemberStats(userId: string) {
  const link = await getRoobetLink(userId);

  const [watch] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${watchTime.minutes}), 0)::int`,
      streams: sql<number>`count(*)::int`,
    })
    .from(watchTime)
    .where(and(eq(watchTime.userId, userId), sql`${watchTime.minutes} > 0`));

  // Weighted wager, the same number milestones and the leaderboard count.
  let lifetime: number | null = null;
  let month: number | null = null;
  if (link?.status === 'approved' && link.roobetUid) {
    [lifetime, month] = await Promise.all([
      wagerTotalFor(link.roobetUid, null, null, 'weighted'),
      wagerTotalFor(link.roobetUid, monthStart(), null, 'weighted'),
    ]);
  }

  return { link, watchMinutes: watch.minutes, streams: watch.streams, lifetime, month };
}
