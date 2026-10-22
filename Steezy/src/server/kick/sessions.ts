/**
 * Stream sessions: one row per broadcast, opened and closed by Kick's
 * `livestream.status.updated` webhook. Chat only earns watch time while a
 * session is open. A partial unique index guarantees at most one open session.
 */
import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { db } from '@/server/db';
import { streamSessions } from '@/server/db/schema';
import { audit } from '@/server/services/audit';

const STALE_AFTER_MS = 18 * 60 * 60 * 1000;

export async function openSession() {
  const [row] = await db.select().from(streamSessions).where(isNull(streamSessions.endedAt)).limit(1);
  return row ?? null;
}

export async function lastSession() {
  const [row] = await db.select().from(streamSessions).orderBy(desc(streamSessions.startedAt)).limit(1);
  return row ?? null;
}

export type LiveEvent = { isLive: boolean; title: string | null; startedAt: Date | null; endedAt: Date | null };

/** Apply a live/offline event. Idempotent: repeated "live" events keep the open session (updating its title). */
export async function applyLiveEvent(event: LiveEvent): Promise<'started' | 'updated' | 'ended' | 'ignored'> {
  const open = await openSession();

  if (event.isLive) {
    if (open) {
      if (event.title && event.title !== open.title) {
        await db.update(streamSessions).set({ title: event.title }).where(eq(streamSessions.id, open.id));
      }
      return 'updated';
    }
    const [created] = await db
      .insert(streamSessions)
      .values({ title: event.title, startedAt: event.startedAt ?? new Date() })
      .onConflictDoNothing()
      .returning({ id: streamSessions.id });
    if (!created) return 'updated'; // lost a race with a duplicate delivery
    await audit(null, 'stream.live', 'stream_session', created.id, null, { title: event.title });
    await announceLive(event.title);
    return 'started';
  }

  if (!open) return 'ignored';
  await db
    .update(streamSessions)
    .set({ endedAt: event.endedAt ?? new Date() })
    .where(and(eq(streamSessions.id, open.id), isNull(streamSessions.endedAt)));
  await audit(null, 'stream.offline', 'stream_session', open.id);
  return 'ended';
}

/** Safety net for a missed offline event: close a session that has been open implausibly long. */
export async function closeStaleSessions(now = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);
  const closed = await db
    .update(streamSessions)
    .set({ endedAt: now })
    .where(and(isNull(streamSessions.endedAt), lt(streamSessions.startedAt, cutoff)))
    .returning({ id: streamSessions.id });
  for (const s of closed) await audit(null, 'stream.auto_closed', 'stream_session', s.id);
  return closed.length;
}

/** Optional "Steezy is live" post to a Discord channel webhook. Never blocks the event. */
async function announceLive(title: string | null) {
  const url = process.env.DISCORD_LIVE_WEBHOOK_URL?.trim();
  const slug = process.env.KICK_CHANNEL_SLUG?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔴 Steezy is live${title ? `: **${title}**` : ''}${slug ? `\nhttps://kick.com/${slug}` : ''}`,
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn('[stream] Discord live post failed', error);
  }
}
