'use server';

/**
 * Bonus hunt and slot catalog actions (ported from MattySpins' admin actions).
 *
 * Each returns an Outcome — a sentence for the mod — rather than redirecting,
 * so the controls on the hunt screen can show it inline while the stream runs.
 */
import { revalidatePath } from 'next/cache';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { audit } from '@/server/services/audit';
import {
  HuntError,
  addBonus,
  createHunt,
  deleteHunt,
  dismissRequest,
  markGtbPrizePaid,
  removeBonus,
  setGuessing,
  setHuntStatus,
  setPayout,
  setRequestsOpen,
  settleGuessing,
  updateHunt,
  type HuntStatus,
} from '@/server/services/hunts';
import { SlotError, addManualSlot, deleteSlot, searchSlots, syncCatalog, type Slot } from '@/server/services/slots';
import { money } from '@/lib/format';

export type Outcome = { ok: true; message: string } | { ok: false; error: string };

const DENIED: Outcome = { ok: false, error: 'Staff only.' };
const MAX_HUNT_MONEY = 10_000_000;

async function staff() {
  const user = await getCurrentUser();
  return user && hasRole(user, 'mod') ? user : null;
}

function revalidateHunt(): void {
  revalidatePath('/admin/hunt');
  revalidatePath('/hunt');
}

/** A money figure from a form: non-negative, at most two decimal places. */
function moneyField(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return amount <= MAX_HUNT_MONEY ? amount : null;
}

/**
 * Every hunt action has the same shape — staff check, one store call, audit,
 * revalidate — and the same failure: a HuntError is a sentence for the mod,
 * anything else is a bug and is rethrown.
 */
async function huntAction(action: string, target: string, detail: Record<string, unknown>, run: () => Promise<string>): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  try {
    const message = await run();
    await audit(who.id, action, 'hunt', target, null, detail);
    revalidateHunt();
    return { ok: true, message };
  } catch (error) {
    if (error instanceof HuntError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function startHunt(formData: FormData): Promise<Outcome> {
  const title = String(formData.get('title') ?? '').trim().slice(0, 80);
  const startCost = moneyField(formData.get('startCost'));
  if (!title) return { ok: false, error: 'Give the hunt a name.' };
  if (startCost == null) return { ok: false, error: 'Enter the start balance, e.g. 1000 or 1000.50.' };
  return huntAction('hunt.created', title, { startCost }, async () => {
    await createHunt({ title, startCost });
    return `"${title}" is live. Chat can !sr now.`;
  });
}

export async function saveHunt(formData: FormData): Promise<Outcome> {
  const huntId = Number(formData.get('huntId'));
  const title = String(formData.get('title') ?? '').trim().slice(0, 80);
  const startCost = moneyField(formData.get('startCost'));
  if (!title) return { ok: false, error: 'Give the hunt a name.' };
  if (startCost == null) return { ok: false, error: 'Enter the start balance, e.g. 1000 or 1000.50.' };
  return huntAction('hunt.edited', String(huntId), { title, startCost }, async () => {
    await updateHunt(huntId, { title, startCost });
    return 'Saved.';
  });
}

export async function moveHunt(huntId: number, next: HuntStatus): Promise<Outcome> {
  return huntAction('hunt.status', String(huntId), { next }, async () => {
    await setHuntStatus(huntId, next);
    return next === 'opening'
      ? 'Opening. Requests are closed and guessing is locked.'
      : next === 'finished'
        ? 'Hunt finished. Settle guess the balance to name the winner.'
        : 'Back to collecting.';
  });
}

export async function toggleRequests(huntId: number, open: boolean): Promise<Outcome> {
  return huntAction('hunt.requests', String(huntId), { open }, async () => {
    await setRequestsOpen(huntId, open);
    return open ? '!sr is open.' : '!sr is closed.';
  });
}

export async function openGuessing(formData: FormData): Promise<Outcome> {
  const huntId = Number(formData.get('huntId'));
  const prize = String(formData.get('prize') ?? '').trim().slice(0, 80) || null;
  return huntAction('hunt.gtb.opened', String(huntId), { prize }, async () => {
    await setGuessing(huntId, 'open', prize);
    return `Guessing is open${prize ? ` for ${prize}` : ''}. Chat types !gtb <amount>.`;
  });
}

export async function lockGuessing(huntId: number): Promise<Outcome> {
  return huntAction('hunt.gtb.locked', String(huntId), {}, async () => {
    await setGuessing(huntId, 'locked');
    return 'Guessing is locked.';
  });
}

export async function addHuntBonus(formData: FormData): Promise<Outcome> {
  const huntId = Number(formData.get('huntId'));
  const bet = moneyField(formData.get('bet'));
  const slotId = Number(formData.get('slotId')) || null;
  const requestId = Number(formData.get('requestId')) || null;
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  const provider = String(formData.get('provider') ?? '').trim();
  if (bet == null || bet <= 0) return { ok: false, error: 'Enter the bet size, e.g. 2 or 0.40.' };
  return huntAction('hunt.bonus.added', String(huntId), { slotId, requestId, name, bet }, async () => {
    await addBonus({ huntId, bet, slotId, requestId, name, provider });
    return 'Added.';
  });
}

export async function saveBonusPayout(formData: FormData): Promise<Outcome> {
  const bonusId = Number(formData.get('bonusId'));
  const raw = String(formData.get('payout') ?? '').trim();
  const payout = raw === '' ? null : moneyField(raw);
  if (raw !== '' && payout == null) return { ok: false, error: 'Enter what it paid, e.g. 246.80.' };
  return huntAction('hunt.bonus.payout', String(bonusId), { payout }, async () => {
    await setPayout(bonusId, payout);
    return payout == null ? 'Cleared.' : 'Saved.';
  });
}

export async function deleteBonus(bonusId: number): Promise<Outcome> {
  return huntAction('hunt.bonus.removed', String(bonusId), {}, async () => {
    await removeBonus(bonusId);
    return 'Removed.';
  });
}

export async function removeHunt(huntId: number): Promise<Outcome> {
  // Filled in by the delete, so the audit row names the hunt that went.
  const detail: Record<string, unknown> = {};
  return huntAction('hunt.deleted', String(huntId), detail, async () => {
    const { title } = await deleteHunt(huntId);
    detail.title = title;
    return `Deleted "${title}".`;
  });
}

export async function dismissSlotRequest(requestId: number): Promise<Outcome> {
  return huntAction('hunt.request.dismissed', String(requestId), {}, async () => {
    await dismissRequest(requestId);
    return 'Dismissed.';
  });
}

/** Settlement writes its own audit row inside its transaction. */
export async function settleHunt(huntId: number): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  try {
    const result = await settleGuessing(huntId, who.id);
    revalidateHunt();
    if (!result.winner) {
      return { ok: true, message: `Final balance ${money(result.finalBalance)}. No linked account guessed, so nobody wins.` };
    }
    return {
      ok: true,
      message: `Final balance ${money(result.finalBalance)}. ${result.winner.name} guessed ${money(result.winner.guess)}${result.prize ? ` and wins ${result.prize} — mark it paid once it's sent` : ''}.`,
    };
  } catch (error) {
    if (error instanceof HuntError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function markHuntPrizePaid(huntId: number): Promise<Outcome> {
  return huntAction('hunt.gtb.prize_paid', String(huntId), {}, async () => {
    await markGtbPrizePaid(huntId);
    return 'Marked paid.';
  });
}

/* -------------------------------------------------------------------------- */
/* Slot catalog                                                               */
/* -------------------------------------------------------------------------- */

/** The add-bonus picker's type-ahead. Staff only, and a handful of rows. */
export async function findSlots(q: string): Promise<Slot[]> {
  const who = await staff();
  if (!who || q.trim().length < 2) return [];
  const { slots } = await searchSlots({ q, sort: 'az', perPage: 8 });
  return slots;
}

export async function syncSlots(): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  const result = await syncCatalog();
  if (!result.ok) return { ok: false, error: result.detail };
  await audit(who.id, 'slots.synced', 'slots', null, null, { seen: result.seen, total: result.total });
  revalidatePath('/admin/slots');
  return {
    ok: true,
    message: `Read ${result.seen.toLocaleString('en-US')} slots from bonushunt.gg${result.truncated ? ' (stopped at the page limit)' : ''}. The catalog holds ${result.total.toLocaleString('en-US')}.`,
  };
}

export async function addSlot(formData: FormData): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  const name = String(formData.get('name') ?? '');
  const provider = String(formData.get('provider') ?? '');
  const imageUrl = String(formData.get('imageUrl') ?? '').trim() || null;
  const bonusBuy = formData.get('bonusBuy') === 'on' ? true : null;
  try {
    const slot = await addManualSlot({ name, provider, imageUrl, bonusBuy });
    await audit(who.id, 'slots.added', 'slot', String(slot.id), null, { name: slot.name, provider: slot.provider });
    revalidatePath('/admin/slots');
    return { ok: true, message: `${slot.name} is in the catalog.` };
  } catch (error) {
    if (error instanceof SlotError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function removeSlot(slotId: number, name: string): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  await deleteSlot(slotId);
  await audit(who.id, 'slots.removed', 'slot', String(slotId), { name }, null);
  revalidatePath('/admin/slots');
  return { ok: true, message: `Removed ${name}.` };
}
