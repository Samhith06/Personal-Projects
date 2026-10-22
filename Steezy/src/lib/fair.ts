/**
 * Provably fair draws for raffles and giveaways.
 *
 *   1. When a draw opens we pick a secret 32-byte seed and publish
 *      `seedHash = sha256(seed)`. The seed can't change after that without
 *      the hash visibly no longer matching.
 *   2. Entries are frozen when the draw closes and sorted by entry id, so their
 *      order doesn't depend on timing.
 *   3. Winner k (k = 0, 1, …) is picked with
 *        r = first 52 bits of HMAC-SHA256(key = seed, message = `${drawId}:${k}`) / 2^52
 *        target = floor(r × totalWeight)
 *      walking the cumulative weights; the winner is removed before the next pick.
 *   4. After the draw we reveal the seed. Anyone can re-run steps 2–3 with the
 *      published entry list and get the same winners.
 *
 * Weights are raffle tickets; giveaway entries all weigh 1.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';

export type FairEntry = { id: string; weight: number };

export const newSeed = () => randomBytes(32).toString('hex');

export const hashSeed = (seed: string) => createHash('sha256').update(seed).digest('hex');

/** Uniform number in [0, 1) for pick `k` of draw `drawId`. */
export function fairRandom(seed: string, drawId: string, k: number) {
  const hex = createHmac('sha256', seed).update(`${drawId}:${k}`).digest('hex').slice(0, 13); // 52 bits
  return parseInt(hex, 16) / 2 ** 52;
}

/** Winner ids in pick order (at most `count`, fewer if there aren't enough entries). */
export function drawWinners(seed: string, drawId: string, entries: FairEntry[], count: number): string[] {
  const pool = entries
    .filter((e) => e.weight > 0)
    .map((e) => ({ id: e.id, weight: Math.floor(e.weight) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const winners: string[] = [];

  for (let k = 0; k < count && pool.length; k++) {
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    const target = Math.floor(fairRandom(seed, drawId, k) * total);
    let acc = 0;
    const index = pool.findIndex((e) => (acc += e.weight) > target);
    winners.push(pool[index].id);
    pool.splice(index, 1);
  }
  return winners;
}
