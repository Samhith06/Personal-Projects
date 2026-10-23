/**
 * `!sr <slot>` suggestions for the bonus hunt. Taken while the current hunt
 * is still being collected (not opening, not finished) and staff haven't
 * closed requests. Staff add the ones they like on bonushunt.gg and mark them
 * added here with the base bet and the kind of bonus (normal, super or
 * hidden); the public hunt page shows what chat suggested.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { huntRequests, hunts } from '@/server/db/schema';
import { audit } from './audit';
import type { Hunt } from './hunts';
import { slotKey } from './slot-art';

export type HuntRequest = typeof huntRequests.$inferSelect;

export const requestsOpen = (h: Hunt) => !h.completed && !h.isOpening && !h.hidden && h.requestsOpen;

/** A viewer can have this many suggestions waiting at once, so one person can't flood the queue. */
export const MAX_PENDING_PER_VIEWER = 3;

export type RequestResult = 'added' | 'duplicate' | 'limit' | 'closed';

export async function requestSlot(hunt: Hunt, kickUserId: string, kickUsername: string, slot: string): Promise<RequestResult> {
  if (!requestsOpen(hunt)) return 'closed';
  const mine = await db
    .select({ key: huntRequests.slotKey, status: huntRequests.status })
    .from(huntRequests)
    .where(and(eq(huntRequests.huntId, hunt.id), eq(huntRequests.kickUserId, kickUserId)));
  const key = slotKey(slot);
  if (mine.some((r) => r.key === key)) return 'duplicate';
  if (mine.filter((r) => r.status === 'pending').length >= MAX_PENDING_PER_VIEWER) return 'limit';
  const inserted = await db
    .insert(huntRequests)
    .values({ huntId: hunt.id, kickUserId, kickUsername, slot, slotKey: key })
    .onConflictDoNothing()
    .returning({ id: huntRequests.id });
  return inserted.length ? 'added' : 'duplicate';
}

export async function requestsFor(huntId: string, statuses: string[] = ['pending']) {
  return db
    .select()
    .from(huntRequests)
    .where(and(eq(huntRequests.huntId, huntId), inArray(huntRequests.status, statuses)))
    .orderBy(asc(huntRequests.createdAt));
}

/** Who suggested each slot (first suggestion wins), for "requested by" on the bonus list. */
export async function requestersBySlot(huntId: string) {
  const rows = await requestsFor(huntId, ['pending', 'added']);
  const by = new Map<string, string>();
  for (const r of rows) if (!by.has(r.slotKey)) by.set(r.slotKey, r.kickUsername);
  return by;
}

export const BONUS_TYPES = ['normal', 'super', 'hidden'] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

/** Staff bought it: record the base bet and the kind of bonus, and take it off the queue. */
export async function addRequest(id: string, bet: number, bonusType: BonusType, actorId: string) {
  const [r] = await db.update(huntRequests).set({ status: 'added', bet, bonusType }).where(eq(huntRequests.id, id)).returning();
  if (r) await audit(actorId, 'hunt.request_added', 'hunt', r.huntId, null, { slot: r.slot, by: r.kickUsername, bet, bonusType });
  return r ?? null;
}

export async function setRequestStatus(id: string, status: 'dismissed' | 'pending', actorId: string) {
  const [r] = await db.update(huntRequests).set({ status }).where(eq(huntRequests.id, id)).returning();
  if (r) await audit(actorId, `hunt.request_${status}`, 'hunt', r.huntId, null, { slot: r.slot, by: r.kickUsername });
  return r ?? null;
}

export async function setHuntRequestsOpen(huntId: string, open: boolean, actorId: string) {
  await db.update(hunts).set({ requestsOpen: open }).where(eq(hunts.id, huntId));
  await audit(actorId, open ? 'hunt.requests_open' : 'hunt.requests_close', 'hunt', huntId);
}
