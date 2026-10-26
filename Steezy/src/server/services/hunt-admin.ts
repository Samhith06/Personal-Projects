/**
 * Bonus hunts run from the admin panel (MattySpins style), next to the ones
 * mirrored from bonushunt.gg. They live in the same `hunts` table with a
 * `local-` id, so the site, the overlay, `!sr` and `!guess` treat both alike;
 * the sync only ever upserts bonushunt.gg ids, so it never touches these.
 *
 * Every change rewrites `bonuses` and recomputes `stats` in the shape the
 * bonushunt.gg API uses, which is what everything downstream reads.
 *
 * A hunt moves collecting → opening → finished. Bonuses are added and removed
 * while collecting; payouts are entered while opening. Finishing settles
 * guess-the-balance against the total won.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { hunts } from '@/server/db/schema';
import { audit } from './audit';
import { getHunt, huntBonuses, isOpened, settleCompletedHunts, type Hunt, type HuntBonus, type HuntStats } from './hunts';

export const isLocalHunt = (h: Pick<Hunt, 'id'>) => h.id.startsWith('local-');

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeStats(startCost: number, bonuses: HuntBonus[]): HuntStats {
  const opened = bonuses.filter(isOpened);
  const won = round2(opened.reduce((sum, b) => sum + (b.payout ?? 0), 0));
  const leftBet = bonuses.filter((b) => !isOpened(b)).reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const openedBet = opened.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  return {
    bonusCount: bonuses.length,
    openedBonuses: opened.length,
    totalWinnings: won,
    profitLoss: round2(won - startCost),
    averagePayoutRequired: leftBet > 0 ? Math.max(0, startCost - won) / leftBet : null,
    currentAverage: opened.length ? won / opened.length : null,
    currentAverageMultiplier: openedBet > 0 ? won / openedBet : null,
  };
}

/** The next bonus to open, in list order. */
const nextUnopened = (bonuses: HuntBonus[]) => bonuses.find((b) => !isOpened(b))?.id ?? null;

async function saveBonuses(h: Hunt, bonuses: HuntBonus[], extra: Partial<typeof hunts.$inferInsert> = {}) {
  const ordered = bonuses.map((b, i) => ({ ...b, order: i }));
  await db
    .update(hunts)
    .set({
      bonuses: ordered,
      stats: computeStats(extra.startCost ?? h.startCost, ordered),
      currentOpeningSlot: (extra.isOpening ?? h.isOpening) ? nextUnopened(ordered) : null,
      remoteUpdatedAt: new Date(),
      ...extra,
    })
    .where(eq(hunts.id, h.id));
}

/** Loads a hunt staff can edit here, or says why not. */
async function editable(id: string): Promise<Hunt | string> {
  const h = await getHunt(id);
  if (!h) return 'Hunt not found.';
  if (!isLocalHunt(h)) return 'That hunt is run on bonushunt.gg — change it there.';
  return h;
}

export async function startHunt(title: string, startCost: number, actorId: string) {
  const id = `local-${randomUUID()}`;
  const now = new Date();
  await db.insert(hunts).values({
    id,
    title,
    startCost,
    stats: computeStats(startCost, []),
    bonuses: [],
    remoteCreatedAt: now,
    remoteUpdatedAt: now,
    // Guessing opens separately, when staff choose; !sr is on from the start.
    guessesOpen: false,
    requestsOpen: true,
  });
  await audit(actorId, 'hunt.create', 'hunt', id, null, { title, startCost });
  return id;
}

export async function renameHunt(id: string, title: string, startCost: number, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (h.settledAt) return 'This hunt is settled.';
  await saveBonuses(h, huntBonuses(h), { title, startCost });
  await audit(actorId, 'hunt.update', 'hunt', id, { title: h.title, startCost: h.startCost }, { title, startCost });
  return null;
}

export async function addBonus(id: string, bonus: { slotName: string; provider: string | null; slotImage: string | null; betSize: number; requestedBy?: string }, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (h.completed) return 'This hunt is finished.';
  await saveBonuses(h, [...huntBonuses(h), { id: randomUUID(), ...bonus, payout: null, multiplier: null }]);
  await audit(actorId, 'hunt.bonus_add', 'hunt', id, null, { slot: bonus.slotName, bet: bonus.betSize });
  return null;
}

export async function removeBonus(id: string, bonusId: string, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (h.isOpening || h.completed) return 'Bonuses can only be removed while collecting.';
  const gone = huntBonuses(h).find((b) => b.id === bonusId);
  if (!gone) return 'Bonus not found.';
  await saveBonuses(h, huntBonuses(h).filter((b) => b.id !== bonusId));
  await audit(actorId, 'hunt.bonus_remove', 'hunt', id, { slot: gone.slotName }, null);
  return null;
}

/** A payout of `null` clears it (the bonus goes back to unopened). */
export async function setPayout(id: string, bonusId: string, payout: number | null, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (!h.isOpening) return 'Start opening before entering payouts.';
  const list = huntBonuses(h);
  const b = list.find((x) => x.id === bonusId);
  if (!b) return 'Bonus not found.';
  const next = list.map((x) =>
    x.id === bonusId ? { ...x, payout, multiplier: payout !== null && x.betSize ? round2(payout / x.betSize) : null } : x,
  );
  await saveBonuses(h, next);
  await audit(actorId, 'hunt.payout', 'hunt', id, { slot: b.slotName, payout: b.payout ?? null }, { payout });
  return null;
}

export type Phase = 'collecting' | 'opening' | 'finished';

/** Ending with nothing added, or with bonuses still unopened, leaves only a partial balance. */
const partial = (bonuses: HuntBonus[]) => bonuses.length === 0 || bonuses.some((b) => !isOpened(b));

/** A hunt run here that was ended before every bonus was opened. It has no guess winner. */
export const endedEarly = (h: Hunt) => isLocalHunt(h) && h.completed && partial(huntBonuses(h));

export async function setPhase(id: string, phase: Phase, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (h.settledAt) return 'This hunt is settled.';
  const list = huntBonuses(h);
  if (phase === 'opening' && list.length === 0) return 'Add a bonus first.';
  // Finishing with bonuses still unopened ends the hunt early. The balance is
  // only partial, so it's marked settled with no winner rather than handing
  // the guess prize to whoever guessed lowest.
  const early = phase === 'finished' && partial(list);
  // Opening closes !sr and guessing; going back to collecting leaves them for staff to reopen.
  const change =
    phase === 'collecting'
      ? { isOpening: false, completed: false }
      : phase === 'opening'
        ? { isOpening: true, completed: false, guessesOpen: false, requestsOpen: false }
        : { isOpening: false, completed: true, guessesOpen: false, requestsOpen: false, ...(early ? { settledAt: new Date() } : {}) };
  await saveBonuses(h, list, change);
  await audit(actorId, early ? 'hunt.ended_early' : `hunt.${phase}`, 'hunt', id, null, early ? { unopened: list.filter((b) => !isOpened(b)).length } : null);
  if (phase === 'finished' && !early) await settleCompletedHunts();
  return null;
}

/** A hunt whose prize was handed to a winner is that payment's record, so it stays. */
export async function deleteHunt(id: string, actorId: string) {
  const h = await editable(id);
  if (typeof h === 'string') return h;
  if (h.winnerUserId && h.guessPrize) return 'This hunt paid a prize, so it stays on record.';
  await db.delete(hunts).where(eq(hunts.id, id));
  await audit(actorId, 'hunt.delete', 'hunt', id, { title: h.title }, null);
  return null;
}
