/**
 * bonushunt.gg public API client.
 *
 *   GET /api/public/hunts            → { hunts: Hunt[], pagination: { limit, offset, total, hasMore } }
 *        ?status=completed           → only finished hunts
 *        ?limit=&offset=             → paging (limit defaults to 50)
 *   GET /api/public/hunts/:id        → Hunt
 *
 * Auth: `Authorization: Bearer <BONUSHUNT_API_KEY>`. Shapes confirmed against the
 * live API on 2026-10-22. The API has no tournament endpoints.
 */
import { z } from 'zod';

const BASE = 'https://bonushunt.gg/api/public';

const num = z.number().nullable().optional();

export const bonusSchema = z.object({
  id: z.string(),
  slotName: z.string(),
  provider: z.string().nullish(),
  slotImage: z.string().nullish(),
  betSize: z.number().nullish(),
  payout: num,
  multiplier: num,
  note: z.string().nullish(),
  order: z.number().nullish(),
});

export const huntSchema = z.object({
  id: z.string(),
  title: z.string(),
  casino: z.string().nullish(),
  startCost: z.number(),
  currency: z.string().nullish(),
  isOpening: z.boolean(),
  currentOpeningSlot: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stats: z
    .object({
      bonusCount: num,
      openedBonuses: num,
      unopenedBonuses: num,
      totalWinnings: num,
      profitLoss: num,
      profitLossPercentage: num,
      averagePayoutRequired: num,
      currentAverage: num,
      averageBetSize: num,
      currentAverageMultiplier: num,
    })
    .partial()
    .passthrough(),
  bonuses: z.array(bonusSchema).default([]),
});

export type BhHunt = z.infer<typeof huntSchema>;
export type BhBonus = z.infer<typeof bonusSchema>;

const listSchema = z.object({
  hunts: z.array(huntSchema),
  pagination: z.object({ limit: z.number(), offset: z.number(), total: z.number(), hasMore: z.boolean() }),
});

async function get(path: string, apiKey: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`bonushunt.gg ${path} failed (${res.status}) ${(await res.text().catch(() => '')).slice(0, 160)}`);
  return res.json();
}

/** Every hunt (all pages). `completed` limits to finished hunts. */
export async function fetchHunts(apiKey: string, opts: { completed?: boolean; max?: number } = {}): Promise<BhHunt[]> {
  const out: BhHunt[] = [];
  const max = opts.max ?? 500;
  for (let offset = 0; out.length < max; ) {
    const q = new URLSearchParams({ limit: '50', offset: String(offset) });
    if (opts.completed) q.set('status', 'completed');
    const page = listSchema.parse(await get(`/hunts?${q}`, apiKey));
    out.push(...page.hunts);
    if (!page.pagination.hasMore || !page.hunts.length) break;
    offset += page.hunts.length;
  }
  return out;
}
