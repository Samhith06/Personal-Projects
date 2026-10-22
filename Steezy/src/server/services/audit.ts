/** Append-only record of staff and system actions. `actorId` null = the system. */
import { db } from '@/server/db';
import { auditLog } from '@/server/db/schema';

export async function audit(
  actorId: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  before: unknown = null,
  after: unknown = null,
) {
  await db.insert(auditLog).values({ actorId, action, targetType, targetId, before, after });
}
