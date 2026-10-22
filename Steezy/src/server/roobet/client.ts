/**
 * Roobet affiliate API client.
 *
 * `GET /affiliate/v2/stats?userId&startDate&endDate` with the API key as a
 * Bearer token returns one row per referred player active in the window, with
 * totals for that window only (no per-bet history). Response shape confirmed
 * against the live API on 2026-10-22.
 */
import { z } from 'zod';

const multiplier = z
  .object({
    multiplier: z.number(),
    wagered: z.number(),
    payout: z.number(),
    gameId: z.string(),
    gameTitle: z.string(),
  })
  .partial()
  .nullable()
  .optional();

const row = z.object({
  uid: z.string(),
  username: z.string(),
  wagered: z.number(),
  weightedWagered: z.number(),
  favoriteGameId: z.string().nullish(),
  favoriteGameTitle: z.string().nullish(),
  rankLevel: z.number().nullish(),
  rankLevelImage: z.string().nullish(),
  highestMultiplier: multiplier,
});

export type RoobetRow = z.infer<typeof row>;

export type RoobetConfig = { apiUrl: string; userId: string; apiKey: string };

export async function fetchRoobetStats(config: RoobetConfig, start: Date, end: Date): Promise<RoobetRow[]> {
  const url = new URL(config.apiUrl);
  url.searchParams.set('userId', config.userId);
  url.searchParams.set('startDate', start.toISOString());
  url.searchParams.set('endDate', end.toISOString());

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Roobet stats request failed (${res.status}) ${body.slice(0, 200)}`);
  }
  return z.array(row).parse(await res.json());
}
