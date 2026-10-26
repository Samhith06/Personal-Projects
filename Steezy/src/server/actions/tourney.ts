'use server';

/** Slot tournament actions (ported from MattySpins). Each returns a sentence for the mod. */
import { revalidatePath } from 'next/cache';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { audit } from '@/server/services/audit';
import {
  TourneyError,
  createTourney,
  deleteTourney,
  finishTourney,
  forfeitCurrent,
  markTourneyPrizePaid,
  removeSignup,
  resolveTourneyTurn,
  seedBracket,
  setTourneyRequestsOpen,
  skipTourneyTurn,
  startTourneyBuy,
  undoLastTourneyTurn,
} from '@/server/services/tourney';
import { TOURNEY_SIZES, x as tx100 } from '@/lib/tourney';
import type { Outcome } from './hunts';

const DENIED: Outcome = { ok: false, error: 'Staff only.' };
const MAX_MONEY = 10_000_000;

async function staff() {
  const user = await getCurrentUser();
  return user && hasRole(user, 'mod') ? user : null;
}

function revalidateTourney(): void {
  revalidatePath('/admin/tournament');
  revalidatePath('/tournament');
}

function moneyField(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return amount <= MAX_MONEY ? amount : null;
}

/** Staff check, one store call, audit, revalidate; a TourneyError is a sentence for the mod. */
async function tourneyAction(action: string, target: string, detail: Record<string, unknown>, run: () => Promise<string>): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  try {
    const message = await run();
    await audit(who.id, action, 'tourney', target, null, detail);
    revalidateTourney();
    return { ok: true, message };
  } catch (error) {
    if (error instanceof TourneyError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function startTourney(formData: FormData): Promise<Outcome> {
  const title = String(formData.get('title') ?? '').trim().slice(0, 80);
  const size = Number(formData.get('size'));
  const prize = String(formData.get('prize') ?? '').trim().slice(0, 80) || null;
  if (!title) return { ok: false, error: 'Give the tournament a name.' };
  if (!(TOURNEY_SIZES as readonly number[]).includes(size)) return { ok: false, error: 'Pick a bracket size.' };
  return tourneyAction('tourney.created', title, { size, prize }, async () => {
    await createTourney({ title, size, prize });
    return `Sign-ups for "${title}" are open. Chat enters with !sr <slot>.`;
  });
}

export async function toggleTourneyRequests(gameId: number, open: boolean): Promise<Outcome> {
  return tourneyAction('tourney.requests', String(gameId), { open }, async () => {
    await setTourneyRequestsOpen(gameId, open);
    return open ? '!sr is open.' : '!sr is closed.';
  });
}

export async function removeTourneySignup(entryId: number): Promise<Outcome> {
  return tourneyAction('tourney.signup.removed', String(entryId), {}, async () => {
    await removeSignup(entryId);
    return 'Removed from the sign-ups.';
  });
}

export async function seedTourney(gameId: number): Promise<Outcome> {
  const detail: Record<string, unknown> = {};
  return tourneyAction('tourney.seeded', String(gameId), detail, async () => {
    const r = await seedBracket(gameId);
    Object.assign(detail, r);
    const left = r.left ? ` ${r.left} sign-up${r.left === 1 ? '' : 's'} missed out.` : '';
    const byes = r.byes ? ` ${r.byes} bye${r.byes === 1 ? '' : 's'} into round 2.` : '';
    return `Bracket seeded: ${r.players} players in a ${r.size}-player bracket.${byes}${left}`;
  });
}

export async function nextTourneyBuy(gameId: number): Promise<Outcome> {
  const detail: Record<string, unknown> = {};
  return tourneyAction('tourney.buy', String(gameId), detail, async () => {
    const b = await startTourneyBuy(gameId);
    Object.assign(detail, b);
    return `${b.round}: ${b.viewer} plays ${b.slot} against ${b.opponent}.`;
  });
}

export async function resolveTourney(formData: FormData): Promise<Outcome> {
  const turnId = Number(formData.get('turnId'));
  const buyCost = moneyField(formData.get('buyCost'));
  const payout = moneyField(formData.get('payout'));
  if (buyCost == null || buyCost <= 0) return { ok: false, error: 'Enter what the bonus buy cost, e.g. 200.' };
  if (payout == null) return { ok: false, error: 'Enter what it paid, e.g. 246.80 (0 if nothing).' };
  return tourneyAction('tourney.result', String(turnId), { buyCost, payout }, async () => {
    const r = await resolveTourneyTurn(turnId, buyCost, payout);
    if (r.champion) return `${r.viewer} scores ${tx100(r.score)}. ${r.winner} wins the final! End the tournament to crown them.`;
    if (r.winner) return `${r.viewer} scores ${tx100(r.score)}. ${r.winner} goes through.`;
    if (r.tied) return `${r.viewer} scores ${tx100(r.score)} — level! Both buy again.`;
    return `${r.viewer} scores ${tx100(r.score)}. Next buy: their opponent.`;
  });
}

export async function skipTourney(turnId: number): Promise<Outcome> {
  return tourneyAction('tourney.skipped', String(turnId), {}, async () => {
    await skipTourneyTurn(turnId);
    return 'Skipped. Still their turn: they can !sr another slot, or forfeit them.';
  });
}

export async function forfeitTourney(gameId: number, loser: 'a' | 'b'): Promise<Outcome> {
  const detail: Record<string, unknown> = { loser };
  return tourneyAction('tourney.forfeit', String(gameId), detail, async () => {
    const r = await forfeitCurrent(gameId, loser);
    Object.assign(detail, r);
    return `${r.loser} forfeits. ${r.winner} goes through.`;
  });
}

export async function undoTourneyResult(gameId: number): Promise<Outcome> {
  return tourneyAction('tourney.undone', String(gameId), {}, async () => {
    const viewer = await undoLastTourneyTurn(gameId);
    return `${viewer}'s buy is back in play. Record its result again.`;
  });
}

export async function removeTourney(gameId: number): Promise<Outcome> {
  const detail: Record<string, unknown> = {};
  return tourneyAction('tourney.deleted', String(gameId), detail, async () => {
    detail.title = await deleteTourney(gameId);
    return `Deleted "${detail.title}".`;
  });
}

export async function markTourneyPaid(gameId: number): Promise<Outcome> {
  return tourneyAction('tourney.prize_paid', String(gameId), {}, async () => {
    await markTourneyPrizePaid(gameId);
    return 'Marked paid.';
  });
}

/** Ending writes its own audit row inside its transaction. */
export async function endTourney(gameId: number): Promise<Outcome> {
  const who = await staff();
  if (!who) return DENIED;
  try {
    const r = await finishTourney(gameId, who.id);
    revalidateTourney();
    if (!r.champion) return { ok: true, message: 'Tournament ended before the final was decided, so there is no champion.' };
    if (!r.prize) return { ok: true, message: `${r.champion} is champion.` };
    if (!r.linked) return { ok: true, message: `${r.champion} is champion, but their Kick account isn't linked, so the prize can't be paid.` };
    return { ok: true, message: `${r.champion} is champion and wins ${r.prize}. Mark it paid once it's sent.` };
  } catch (error) {
    if (error instanceof TourneyError) return { ok: false, error: error.message };
    throw error;
  }
}
