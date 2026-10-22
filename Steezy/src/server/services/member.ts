/** Read models for the member's own pages. */
import 'server-only';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { roobetDailyWager, roobetLinks, watchTime } from '@/server/db/schema';

export async function getRoobetLink(userId: string) {
  const [row] = await db.select().from(roobetLinks).where(eq(roobetLinks.userId, userId)).limit(1);
  return row ?? null;
}

/** First day of the current month, UTC, as `YYYY-MM-DD`. */
function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
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

  let lifetime: number | null = null;
  let month: number | null = null;
  if (link?.status === 'approved' && link.roobetUid) {
    const uid = link.roobetUid;
    const [all] = await db
      .select({ total: sql<number>`coalesce(sum(${roobetDailyWager.wagered}), 0)::float8` })
      .from(roobetDailyWager)
      .where(eq(roobetDailyWager.roobetUid, uid));
    const [cur] = await db
      .select({ total: sql<number>`coalesce(sum(${roobetDailyWager.wagered}), 0)::float8` })
      .from(roobetDailyWager)
      .where(and(eq(roobetDailyWager.roobetUid, uid), gte(roobetDailyWager.day, monthStart())));
    lifetime = all.total;
    month = cur.total;
  }

  return { link, watchMinutes: watch.minutes, streams: watch.streams, lifetime, month };
}
