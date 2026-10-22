/**
 * Alt-account detection, IP part.
 *
 * Each login records an HMAC of the client IP (keyed with AUTH_SECRET, so the
 * stored value can't be reversed or matched against other databases). When the
 * same hash already belongs to a different member, an abuse flag is opened for
 * staff to review. Device fingerprints arrive later from the client.
 */
import 'server-only';
import { createHmac } from 'node:crypto';
import { and, eq, ne, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { abuseFlags, userFingerprints } from '@/server/db/schema';
import { env } from '@/lib/env';

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

function hash(value: string) {
  return createHmac('sha256', env.authSecret ?? 'steezy-development-only-secret-change-me').update(value).digest('hex');
}

export async function recordFingerprint(userId: string, request: Request) {
  const ip = clientIp(request);
  if (!ip) return;
  const ipHash = hash(`ip:${ip}`);

  await db
    .insert(userFingerprints)
    .values({ userId, kind: 'ip', hash: ipHash })
    .onConflictDoUpdate({
      target: [userFingerprints.userId, userFingerprints.kind, userFingerprints.hash],
      set: { hits: sql`${userFingerprints.hits} + 1`, lastSeen: new Date() },
    });

  const others = await db
    .select({ userId: userFingerprints.userId })
    .from(userFingerprints)
    .where(and(eq(userFingerprints.kind, 'ip'), eq(userFingerprints.hash, ipHash), ne(userFingerprints.userId, userId)));

  for (const other of others) {
    const [existing] = await db
      .select({ id: abuseFlags.id })
      .from(abuseFlags)
      .where(
        or(
          and(eq(abuseFlags.userId, userId), eq(abuseFlags.relatedUserId, other.userId)),
          and(eq(abuseFlags.userId, other.userId), eq(abuseFlags.relatedUserId, userId)),
        ),
      )
      .limit(1);
    if (!existing) {
      await db.insert(abuseFlags).values({ userId, relatedUserId: other.userId, reason: 'Shared IP address at login' });
    }
  }
}
