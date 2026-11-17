'use server';

/**
 * Double points: turn it on (now or at a set time, for a set length or until
 * turned off), turn it off, start a scheduled one early, extend a timed one.
 * Admin only, every change in the audit log.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/server/auth/session';
import { BoostError, MULTIPLIERS, extendBoost, startBoost, startBoostNow, stopBoost } from '@/server/services/wager-boosts';

const PATH = '/admin/leaderboards';
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

function back(params: Record<string, string>): never {
  revalidatePath('/leaderboard');
  revalidatePath(PATH);
  redirect(`${PATH}?${new URLSearchParams(params)}`);
}

/** Run a boost change and redirect with its message; `redirect` throws, so it stays outside the try. */
async function attempt(fn: () => Promise<string>) {
  let message: string;
  try {
    message = await fn();
  } catch (error) {
    if (error instanceof BoostError) back({ error: error.message });
    throw error;
  }
  back({ ok: message });
}

const fmtLength = (min: number) => (min % 60 === 0 ? `${min / 60} hour${min === 60 ? '' : 's'}` : `${min} minutes`);

export async function turnOnDoublePoints(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const multiplier = Number(str(fd, 'multiplier') || 2);
  if (!MULTIPLIERS.includes(multiplier as (typeof MULTIPLIERS)[number])) back({ error: 'Pick 1.5×, 2× or 3×.' });

  const duration = str(fd, 'duration');
  const minutes = duration === 'open' ? null : Number(duration);
  if (minutes !== null && !(Number.isInteger(minutes) && minutes >= 5 && minutes <= 7 * 24 * 60)) {
    back({ error: 'Length must be between 5 minutes and 7 days.' });
  }

  const now = new Date();
  let startsAt = now;
  if (str(fd, 'when') === 'later') {
    // The browser fills `startsAtIso` from the local date-time picker, so the admin's own time zone is used.
    startsAt = new Date(str(fd, 'startsAtIso'));
    if (Number.isNaN(startsAt.getTime())) back({ error: 'Pick a start time.' });
    if (startsAt.getTime() < now.getTime() - 60_000) back({ error: 'That start time has already passed.' });
    if (startsAt.getTime() > now.getTime() + 30 * 24 * 60 * 60_000) back({ error: 'Schedule it within the next 30 days.' });
  }
  const endsAt = minutes === null ? null : new Date(startsAt.getTime() + minutes * 60_000);

  await attempt(async () => {
    await startBoost({ multiplier, startsAt, endsAt, actorId: staff.id });
    const what = `${multiplier}× points`;
    const length = minutes === null ? 'until you turn it off' : `for ${fmtLength(minutes)}`;
    return startsAt > now ? `${what} scheduled, ${length}.` : `${what} is ON ${length}. The leaderboard banner is up.`;
  });
}

export async function turnOffDoublePoints(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  await attempt(async () => {
    const result = await stopBoost(str(fd, 'id'), staff.id);
    if (result === 'cancelled') return 'Scheduled double points cancelled.';
    if (result === 'ended') return 'It had already ended.';
    return 'Double points turned off. Wagers from here on count normally.';
  });
}

export async function startDoublePointsNow(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  await attempt(async () => {
    await startBoostNow(str(fd, 'id'), staff.id);
    return 'Double points is ON now.';
  });
}

export async function extendDoublePoints(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const minutes = Number(str(fd, 'minutes'));
  if (![15, 30, 60, 120].includes(minutes)) back({ error: 'Pick an extension.' });
  await attempt(async () => {
    await extendBoost(str(fd, 'id'), minutes, staff.id);
    return `Extended by ${fmtLength(minutes)}.`;
  });
}
