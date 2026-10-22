import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { syncState } from '@/server/db/schema';

export async function syncStatus(key: string) {
  const [row] = await db.select().from(syncState).where(eq(syncState.key, key)).limit(1);
  return row ?? null;
}
