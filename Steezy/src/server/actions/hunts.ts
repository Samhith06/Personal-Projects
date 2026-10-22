'use server';

/**
 * Bonus hunt and tournament actions. Members guess; mods run hunts and
 * tournaments on stream (lock guessing, enter results); admins create
 * tournaments and change prizes.
 */
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { hunts } from '@/server/db/schema';
import { requireRole, requireUser } from '@/server/auth/session';
import { bonushuntKey, syncHunts } from '@/server/bonushunt/sync';
import { audit } from '@/server/services/audit';
import { getHunt, parseGuess, placeGuess } from '@/server/services/hunts';
import { createTournament, recordResult, startTournament } from '@/server/services/tournaments';

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
  back('/admin/hunts', { ok: `Saved “${before.title}”.` });
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

/* ----------------------------------------------------------- tournaments */

const entryLine = z.string().transform((line, ctx) => {
  // "player — slot", "player - slot", "player | slot" or "player, slot"
  const [player, ...rest] = line.split(/\s+[—–|-]\s+|\s*\|\s*|,\s*/);
  const slot = rest.join(' ').trim();
  if (!player?.trim() || !slot) {
    ctx.addIssue({ code: 'custom', message: `Couldn’t read “${line}”. Use one “player — slot” per line.` });
    return z.NEVER;
  }
  return { player: player.trim().slice(0, 40), slot: slot.slice(0, 60) };
});

export async function createTournamentAction(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const name = str(fd, 'name');
  if (!name) back('/admin/tournaments', { error: 'Give the tournament a name.' });
  const lines = str(fd, 'entries')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed = z.array(entryLine).min(2, 'Add at least 2 players.').max(64, 'At most 64 players.').safeParse(lines);
  if (!parsed.success) back('/admin/tournaments', { error: parsed.error.issues[0].message });
  const t = await createTournament(name.slice(0, 80), str(fd, 'prize') || null, parsed.data, staff.id);
  back(`/admin/tournaments/${t.id}`, { ok: 'Bracket created. Start it when you go live.' });
}

export async function startTournamentAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'id');
  const r = await startTournament(id, staff.id);
  back(`/admin/tournaments/${id}`, r === 'ok' ? { ok: 'Started. Byes went straight through.' } : { error: 'Already started.' });
}

export async function recordResultAction(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'tournamentId');
  // The dashboard posts here too; only ever send staff back inside /admin.
  const backTo = str(fd, 'back').startsWith('/admin') ? str(fd, 'back') : `/admin/tournaments/${id}`;
  const a = Number(str(fd, 'multiA'));
  const b = Number(str(fd, 'multiB'));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) back(backTo, { error: 'Enter both multipliers as numbers.' });
  const r = await recordResult(str(fd, 'matchId'), a, b, staff.id);
  const msg: Record<string, string> = {
    not_live: 'Start the tournament first.',
    not_ready: 'That match is still waiting for a player.',
    decided: 'That match already has a result.',
    tie: 'It’s a tie — replay the slots and enter the new multipliers.',
  };
  back(backTo, r === 'ok' ? { ok: 'Result saved, winner moved on.' } : { error: msg[r] });
}
