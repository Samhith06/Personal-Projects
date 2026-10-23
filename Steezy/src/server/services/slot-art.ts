/**
 * Slot artwork by name, from the bonuses in synced bonushunt.gg hunts.
 *
 * Roobet's affiliate data has no images and bonushunt.gg has no lookup by
 * name, so a slot Steezy has never hunted has no art; pages show a styled
 * fallback for those.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { hunts } from '@/server/db/schema';

/** "Big Bass Splash 1000" and "big-bass-splash-1000" are the same slot. */
export const slotKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export type SlotArtMap = Map<string, string>;

export async function slotArt(): Promise<SlotArtMap> {
  const rows = await db.execute(sql`
    select b->>'slotName' as name, b->>'slotImage' as image
    from ${hunts}, jsonb_array_elements(${hunts.bonuses}) b
    where coalesce(b->>'slotImage', '') <> ''
  `);
  const art: SlotArtMap = new Map();
  for (const r of rows.rows as { name: string; image: string }[]) art.set(slotKey(r.name), r.image);
  return art;
}

export const artFor = (art: SlotArtMap, name: string | null | undefined) => (name ? (art.get(slotKey(name)) ?? null) : null);
