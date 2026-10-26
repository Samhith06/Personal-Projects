/**
 * Slot artwork by name, from the slot catalog (bonushunt.gg's feed plus the
 * slots staff add by hand) and the bonuses in past hunts.
 *
 * Roobet's affiliate data has no images, so a slot that is in neither has no
 * art; pages show a styled fallback for those.
 */
import { rows } from '@/server/db/sql';

/** "Big Bass Splash 1000" and "big-bass-splash-1000" are the same slot. */
export const slotKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export type SlotArtMap = Map<string, string>;

export async function slotArt(): Promise<SlotArtMap> {
  const found = await rows<{ name: string; image: string }>(`
    SELECT name, image_url AS image, 0 AS pick FROM slots WHERE coalesce(image_url, '') <> ''
    UNION ALL
    SELECT slot_name, image_url, 1 FROM hunt_bonuses WHERE coalesce(image_url, '') <> ''
    ORDER BY pick
  `);
  const art: SlotArtMap = new Map();
  // Catalog rows come first, so they win over a hunt's copy.
  for (const r of found) if (!art.has(slotKey(r.name))) art.set(slotKey(r.name), r.image);
  return art;
}

export const artFor = (art: SlotArtMap, name: string | null | undefined) => (name ? (art.get(slotKey(name)) ?? null) : null);
