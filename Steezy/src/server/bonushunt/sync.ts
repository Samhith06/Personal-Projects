/**
 * Mirrors bonushunt.gg hunts into `hunts`, then settles guess-the-balance for
 * any hunt that has just completed. Runs from instrumentation every
 * BONUSHUNT_SYNC_INTERVAL_MS (30 s by default, so the overlay keeps up with the
 * opening). A failed pull leaves the stored hunts alone.
 *
 * No `server-only`: scripts and tests run this under tsx.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { hunts, syncState } from '@/server/db/schema';
import { settleCompletedHunts } from '@/server/services/hunts';
import { fetchHunts } from './client';

export function bonushuntKey() {
  return process.env.BONUSHUNT_API_KEY?.trim() || null;
}

export async function syncHunts(apiKey: string) {
  const now = new Date();
  try {
    const [all, completed] = await Promise.all([fetchHunts(apiKey), fetchHunts(apiKey, { completed: true })]);
    const done = new Set(completed.map((h) => h.id));

    if (all.length) {
      await db
        .insert(hunts)
        .values(
          all.map((h) => ({
            id: h.id,
            title: h.title,
            casino: h.casino ?? null,
            startCost: h.startCost,
            currency: h.currency ?? 'USD',
            isOpening: h.isOpening,
            currentOpeningSlot: h.currentOpeningSlot ?? null,
            completed: done.has(h.id),
            stats: h.stats,
            bonuses: [...h.bonuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            remoteCreatedAt: new Date(h.createdAt),
            remoteUpdatedAt: new Date(h.updatedAt),
            syncedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: hunts.id,
          // API fields only — guessing settings and winners are ours.
          set: {
            title: sql`excluded.title`,
            casino: sql`excluded.casino`,
            startCost: sql`excluded.start_cost`,
            currency: sql`excluded.currency`,
            isOpening: sql`excluded.is_opening`,
            currentOpeningSlot: sql`excluded.current_opening_slot`,
            completed: sql`excluded.completed`,
            stats: sql`excluded.stats`,
            bonuses: sql`excluded.bonuses`,
            remoteUpdatedAt: sql`excluded.remote_updated_at`,
            syncedAt: sql`excluded.synced_at`,
          },
        });
    }

    const settled = await settleCompletedHunts();
    const detail = { hunts: all.length, completed: done.size, settled };
    await db
      .insert(syncState)
      .values({ key: 'bonushunt', lastRunAt: now, lastOkAt: now, lastError: null, detail })
      .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastOkAt: now, lastError: null, detail } });
    return { ok: true as const, ...detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .insert(syncState)
      .values({ key: 'bonushunt', lastRunAt: now, lastError: message })
      .onConflictDoUpdate({ target: syncState.key, set: { lastRunAt: now, lastError: message } });
    return { ok: false as const, error: message };
  }
}
