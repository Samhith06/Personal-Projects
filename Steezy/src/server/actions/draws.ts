'use server';

/**
 * Admin actions for raffles and giveaways. Creating and editing needs `admin`;
 * opening, closing, drawing and marking prizes paid can be done by a `mod`
 * (so a mod can run the draw on stream).
 */
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { giveaways, giveawayWinners, raffles, raffleWinners } from '@/server/db/schema';
import { requireRole } from '@/server/auth/session';
import { audit } from '@/server/services/audit';
import { closeGiveaway, drawGiveaway, getGiveaway, openGiveaway } from '@/server/services/giveaways';
import { closeRaffle, drawRaffle, getRaffle, newOverlayToken, openRaffleDraw } from '@/server/services/raffles';

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params)}`);
}
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');
const prizeList = z
  .string()
  .transform((s) => s.split(/[\s,]+/).filter(Boolean).map(Number))
  .refine((a) => a.length > 0 && a.every((n) => Number.isFinite(n) && n >= 0), 'Prizes must be numbers, e.g. 500, 250, 100');

/* -------------------------------------------------------------------- Raffles */

const raffleForm = z
  .object({
    name: z.string().trim().min(1, 'Give the raffle a name').max(80),
    startDay: isoDay,
    endDay: isoDay,
    metric: z.enum(['wagered', 'weighted']),
    usdPerTicket: z.coerce.number().positive('Dollars per ticket must be above 0'),
    maxTicketsPerUser: z.coerce.number().int().positive('Max tickets must be at least 1'),
    prizes: prizeList,
  })
  .refine((v) => v.endDay >= v.startDay, 'The end date is before the start date');

export async function saveRaffle(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const path = id ? `/admin/raffles/${id}` : '/admin/raffles';
  const parsed = raffleForm.safeParse({
    name: str(fd, 'name'),
    startDay: str(fd, 'startDay'),
    endDay: str(fd, 'endDay'),
    metric: str(fd, 'metric') || 'wagered',
    usdPerTicket: str(fd, 'usdPerTicket'),
    maxTicketsPerUser: str(fd, 'maxTicketsPerUser'),
    prizes: str(fd, 'prizes'),
  });
  if (!parsed.success) back(path, { error: parsed.error.issues[0].message });
  const v = parsed.data;
  const values = {
    name: v.name,
    startsAt: new Date(`${v.startDay}T00:00:00.000Z`),
    endsAt: new Date(`${v.endDay}T23:59:59.999Z`),
    metric: v.metric,
    usdPerTicket: v.usdPerTicket,
    maxTicketsPerUser: v.maxTicketsPerUser,
    prizes: v.prizes,
  };

  if (id) {
    const before = await getRaffle(id);
    if (!before) back('/admin/raffles', { error: 'Raffle not found.' });
    // Once open, the rules are public and the seed is committed: they can't change.
    if (before.status !== 'draft') back(path, { error: 'Only a draft raffle can be edited.' });
    await db.update(raffles).set(values).where(eq(raffles.id, id));
    await audit(staff.id, 'raffle.update', 'raffle', id, before, values);
    back(path, { ok: 'Saved.' });
  }
  const [created] = await db.insert(raffles).values({ ...values, overlayToken: newOverlayToken() }).returning({ id: raffles.id });
  await audit(staff.id, 'raffle.create', 'raffle', created.id, null, values);
  back(`/admin/raffles/${created.id}`, { ok: 'Created as a draft. Open it when ready.' });
}

export async function raffleStep(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'id');
  const step = str(fd, 'step');
  const path = `/admin/raffles/${id}`;
  const result =
    step === 'open' ? await openRaffleDraw(id, staff.id) : step === 'close' ? await closeRaffle(id, staff.id) : step === 'draw' ? await drawRaffle(id, staff.id) : 'bad';
  if (result !== 'ok') back(path, { error: `Can’t ${step} this raffle in its current state.` });
  back(path, { ok: { open: 'Open — seed fingerprint published.', close: 'Closed — tickets frozen.', draw: 'Drawn — winners picked and seed revealed.' }[step] ?? 'Done.' });
}

export async function markRafflePrizePaid(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const raffleId = str(fd, 'raffleId');
  const position = Number(str(fd, 'position'));
  await db
    .update(raffleWinners)
    .set({ paidAt: new Date() })
    .where(and(eq(raffleWinners.raffleId, raffleId), eq(raffleWinners.position, position)));
  await audit(staff.id, 'raffle.prize_paid', 'raffle', raffleId, null, { position });
  back(str(fd, 'back') || '/admin/payouts', { ok: 'Marked paid.' });
}

/* ------------------------------------------------------------------ Giveaways */

const giveawayForm = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(80),
  prize: z.string().trim().min(1, 'Describe the prize').max(120),
  entryKeyword: z
    .string()
    .trim()
    .transform((s) => (s ? (s.startsWith('!') ? s : `!${s}`).toLowerCase() : null))
    .refine((s) => s === null || /^![a-z0-9_]{2,20}$/.test(s), 'Keyword must be like !join'),
  winnersCount: z.coerce.number().int().min(1).max(50),
  timerMinutes: z.coerce.number().int().min(1, 'Timer must be at least a minute').max(180, 'Timer can be at most 3 hours').nullable(),
  kickLinked: z.boolean(),
  roobetApproved: z.boolean(),
  minDiscordAgeDays: z.coerce.number().int().min(0),
  minWatchHours: z.coerce.number().min(0),
});

export async function saveGiveaway(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const path = id ? `/admin/giveaways/${id}` : '/admin/giveaways';
  const parsed = giveawayForm.safeParse({
    title: str(fd, 'title'),
    prize: str(fd, 'prize'),
    entryKeyword: str(fd, 'entryKeyword'),
    winnersCount: str(fd, 'winnersCount') || '1',
    timerMinutes: str(fd, 'timerMinutes') || null,
    kickLinked: fd.get('kickLinked') === 'on',
    roobetApproved: fd.get('roobetApproved') === 'on',
    minDiscordAgeDays: str(fd, 'minDiscordAgeDays') || '0',
    minWatchHours: str(fd, 'minWatchHours') || '0',
  });
  if (!parsed.success) back(path, { error: parsed.error.issues[0].message });
  const v = parsed.data;
  const values = {
    title: v.title,
    prize: v.prize,
    entryKeyword: v.entryKeyword,
    winnersCount: v.winnersCount,
    // The close time is set from the timer when the giveaway opens.
    timerMinutes: v.timerMinutes,
    eligibility: {
      kickLinked: v.kickLinked,
      roobetApproved: v.roobetApproved,
      minDiscordAgeDays: v.minDiscordAgeDays || undefined,
      minWatchMinutes: v.minWatchHours ? Math.round(v.minWatchHours * 60) : undefined,
    },
  };

  if (id) {
    const before = await getGiveaway(id);
    if (!before) back('/admin/giveaways', { error: 'Giveaway not found.' });
    if (before.status !== 'draft') back(path, { error: 'Only a draft giveaway can be edited.' });
    await db.update(giveaways).set(values).where(eq(giveaways.id, id));
    await audit(staff.id, 'giveaway.update', 'giveaway', id, before, values);
    back(path, { ok: 'Saved.' });
  }
  const [created] = await db.insert(giveaways).values({ ...values, overlayToken: newOverlayToken() }).returning({ id: giveaways.id });
  await audit(staff.id, 'giveaway.create', 'giveaway', created.id, null, values);
  back(`/admin/giveaways/${created.id}`, { ok: 'Created as a draft. Open it on stream.' });
}

export async function giveawayStep(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const id = str(fd, 'id');
  const step = str(fd, 'step');
  const path = `/admin/giveaways/${id}`;
  const result =
    step === 'open' ? await openGiveaway(id, staff.id) : step === 'close' ? await closeGiveaway(id, staff.id) : step === 'draw' ? await drawGiveaway(id, staff.id) : 'bad';
  if (result !== 'ok') back(path, { error: `Can’t ${step} this giveaway in its current state.` });
  back(path, { ok: { open: 'Open — entries are being accepted.', close: 'Closed — entries frozen.', draw: 'Drawn — winner on the overlay now.' }[step] ?? 'Done.' });
}

/** Delete a raffle with its frozen tickets and winners. Admin only; kept in the audit log. */
export async function deleteRaffle(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const before = await getRaffle(id);
  if (!before) back('/admin/raffles', { error: 'Raffle not found.' });
  await db.delete(raffles).where(eq(raffles.id, id));
  await audit(staff.id, 'raffle.delete', 'raffle', id, before, null);
  back('/admin/raffles', { ok: `Deleted “${before.name}”.` });
}

/** Delete a giveaway with its entries and winners. Admin only; kept in the audit log. */
export async function deleteGiveaway(fd: FormData): Promise<void> {
  const staff = await requireRole('admin');
  const id = str(fd, 'id');
  const before = await getGiveaway(id);
  if (!before) back('/admin/giveaways', { error: 'Giveaway not found.' });
  await db.delete(giveaways).where(eq(giveaways.id, id));
  await audit(staff.id, 'giveaway.delete', 'giveaway', id, before, null);
  back('/admin/giveaways', { ok: `Deleted “${before.prize}”.` });
}

export async function markGiveawayPaid(fd: FormData): Promise<void> {
  const staff = await requireRole('mod');
  const giveawayId = str(fd, 'giveawayId');
  const position = Number(str(fd, 'position'));
  await db
    .update(giveawayWinners)
    .set({ paidAt: new Date() })
    .where(and(eq(giveawayWinners.giveawayId, giveawayId), eq(giveawayWinners.position, position)));
  await audit(staff.id, 'giveaway.prize_paid', 'giveaway', giveawayId, null, { position });
  back(str(fd, 'back') || '/admin/payouts', { ok: 'Marked paid.' });
}
