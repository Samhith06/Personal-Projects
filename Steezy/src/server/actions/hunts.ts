'use server';

/**
 * Bonus hunt and tournament actions. Members guess; mods run hunts and
 * tournaments on stream (lock guessing, enter results); admins create
 * tournaments and change prizes.
 */
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { hunts } from '@/server/db/schema';
import { requireRole, requireUser } from '@/server/auth/session';
import { bonushuntKey, syncHunts } from '@/server/bonushunt/sync';
import { audit } from '@/server/services/audit';
import { getHunt, parseGuess, placeGuess } from '@/server/services/hunts';
import { BONUS_TYPES, addRequest, setHuntRequestsOpen, setRequestStatus, type BonusType } from '@/server/services/hunt-requests';
import {
  TOURNAMENT_SIZES,
  addEntry,
  createTournament,
  recordResult,
  removeEntry,
  setRequestsOpen,
  startTournament,
} from '@/server/services/tournaments';

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params)}`);
}
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

/* --------------------------------------------------------------- members */

export async function guessAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const result = await placeGuess(str(fd, 'huntId'), user.id, parseGuess(str(fd, 'amount')), 'site');
  back('/hunts', { guess: result });
}

/* ----------------------------------------------------------------- hunts */

export async function syncHuntsNow(): Promise<void> {
  await requireRole('mod');
  const key = bonushuntKey();
  if (!key) back('/admin/hunts', { error: 'BONUSHUNT_API_KEY is not set.' });
  const r = await syncHunts(key);
  back('/admin/hunts', r.ok ? { ok: `Synced ${r.hunts} hunt(s) from bonushunt.gg.` } : { error: r.error });
}

export async function updateHunt(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'huntId');
  const before = await getHunt(id);
  if (!before) back('/admin/hunts', { error: 'Hunt not found.' });
  const change = {
    guessesOpen: fd.get('guessesOpen') === 'on',
    hidden: fd.get('hidden') === 'on',
    guessPrize: str(fd, 'guessPrize') || null,
  };
  await db.update(hunts).set(change).where(eq(hunts.id, id));
  await audit(staff.id, 'hunt.update', 'hunt', id, { guessesOpen: before.guessesOpen, hidden: before.hidden, guessPrize: before.guessPrize }, change);
  back(str(fd, 'back').startsWith('/admin') ? str(fd, 'back') : '/admin/hunts', { ok: `Saved “${before.title}”.` });
}

/** Dashboard quick action: open or close guessing on a hunt. */
export async function toggleGuessing(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'huntId');
  const open = str(fd, 'open') === '1';
  await db.update(hunts).set({ guessesOpen: open }).where(eq(hunts.id, id));
  await audit(staff.id, open ? 'hunt.guessing_open' : 'hunt.guessing_close', 'hunt', id);
  back(str(fd, 'back').startsWith('/admin') ? str(fd, 'back') : '/admin', { ok: open ? 'Guessing opened.' : 'Guessing closed.' });
}

export async function markHuntPrizePaid(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'huntId');
  await db.update(hunts).set({ prizePaidAt: new Date() }).where(eq(hunts.id, id));
  await audit(staff.id, 'hunt.prize_paid', 'hunt', id);
  back(str(fd, 'back') || '/admin/hunts', { ok: 'Marked paid.' });
}

/** Hunt slot requests from `!sr`: dismiss one, or put it back in the queue. */
export async function setRequestStatusAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const status = str(fd, 'status');
  if (status !== 'dismissed' && status !== 'pending') back('/admin/hunts', { error: 'Unknown status.' });
  const r = await setRequestStatus(str(fd, 'requestId'), status as 'dismissed' | 'pending', staff.id);
  back('/admin/hunts', r ? { ok: `${r.slot}: ${status === 'pending' ? 'back in the queue' : 'dismissed'}.` } : { error: 'Request not found.' });
}

/** Staff added a requested slot to the hunt: record its base bet and whether it's a normal, super or hidden bonus. */
export async function addRequestAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const bet = Number(str(fd, 'bet').replace(/[$,\s]/g, ''));
  const bonusType = str(fd, 'bonusType');
  if (!Number.isFinite(bet) || bet <= 0) back('/admin/hunts', { error: 'Enter the base bet, e.g. 0.40.' });
  if (!BONUS_TYPES.includes(bonusType as BonusType)) back('/admin/hunts', { error: 'Pick normal, super or hidden.' });
  const r = await addRequest(str(fd, 'requestId'), Math.round(bet * 100) / 100, bonusType as BonusType, staff.id);
  back('/admin/hunts', r ? { ok: `Added ${r.slot} (${bonusType}, $${bet.toFixed(2)} base bet).` } : { error: 'Request not found.' });
}

export async function toggleHuntRequests(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const open = str(fd, 'open') === '1';
  await setHuntRequestsOpen(str(fd, 'huntId'), open, staff.id);
  back(str(fd, 'back').startsWith('/admin') ? str(fd, 'back') : '/admin/hunts', { ok: open ? 'Slot requests opened.' : 'Slot requests closed.' });
}

/* ----------------------------------------------------------- tournaments */

export async function createTournamentAction(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const name = str(fd, 'name');
  if (!name) back('/admin/tournaments', { error: 'Give the tournament a name.' });
  const size = Number(str(fd, 'size'));
  if (!TOURNAMENT_SIZES.includes(size as (typeof TOURNAMENT_SIZES)[number])) back('/admin/tournaments', { error: 'Pick a bracket size.' });
  const t = await createTournament(name.slice(0, 80), str(fd, 'prize').slice(0, 80) || null, size, staff.id);
  back(`/admin/tournaments/${t.id}`, { ok: 'Created. Sign-ups are open: chat types !sr slot name.' });
}

export async function addEntryAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'tournamentId');
  const player = str(fd, 'player').slice(0, 40);
  const slot = str(fd, 'slot').slice(0, 60);
  if (!player || !slot) back(`/admin/tournaments/${id}`, { error: 'Enter a player and a slot.' });
  const r = await addEntry(id, player, slot, staff.id);
  const msg = { ok: `Added ${player}.`, taken: `${player} is already signed up.`, not_signup: 'Sign-ups are over.' };
  back(`/admin/tournaments/${id}`, r === 'ok' ? { ok: msg.ok } : { error: msg[r] });
}

export async function removeEntryAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const e = await removeEntry(str(fd, 'entryId'), staff.id);
  back(`/admin/tournaments/${str(fd, 'tournamentId')}`, e ? { ok: `Removed ${e.kickUsername}.` } : { error: 'Can’t remove that entry now.' });
}

export async function toggleTournamentRequests(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'tournamentId');
  const open = str(fd, 'open') === '1';
  await setRequestsOpen(id, open, staff.id);
  back(`/admin/tournaments/${id}`, { ok: open ? '!sr is open.' : '!sr is closed.' });
}

export async function startTournamentAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'id');
  const r = await startTournament(id, staff.id);
  const msg = { ok: 'Bracket drawn — it’s live. Byes went straight through.', not_signup: 'Already started.', too_few: 'Needs at least 2 sign-ups.' };
  back(`/admin/tournaments/${id}`, r === 'ok' ? { ok: msg.ok } : { error: msg[r] });
}

const money = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** One buy per player: what it cost and what it paid. The higher multiplier goes through. */
export async function recordResultAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'tournamentId');
  // The dashboard posts here too; only ever send staff back inside /admin.
  const backTo = str(fd, 'back').startsWith('/admin') ? str(fd, 'back') : `/admin/tournaments/${id}`;
  const [costA, payoutA, costB, payoutB] = ['costA', 'payoutA', 'costB', 'payoutB'].map((k) => money(str(fd, k)));
  if (costA === null || payoutA === null || costB === null || payoutB === null || !costA || !costB) {
    back(backTo, { error: 'Enter each buy’s cost (more than 0) and payout.' });
  }
  const r = await recordResult(str(fd, 'matchId'), { cost: costA!, payout: payoutA! }, { cost: costB!, payout: payoutB! }, staff.id);
  const msg: Record<string, string> = {
    not_live: 'The tournament isn’t live.',
    not_ready: 'That match is still waiting for a player.',
    decided: 'That match already has a result.',
  };
  if (r === 'tie') back(backTo, { ok: 'Level — both buy again, then enter the new result.' });
  back(backTo, r === 'ok' ? { ok: 'Result saved, winner moved on.' } : { error: msg[r] });
}
