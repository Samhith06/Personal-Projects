/**
 * Wager raffles: every `usdPerTicket` wagered on Roobet under STZY inside the
 * raffle window is one ticket (capped per member). Only members with an
 * approved Roobet username can hold tickets.
 *
 *   draft → open (seed hash published) → closed (tickets frozen) → drawn (seed revealed)
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/server/db';
import { raffles, raffleTickets, raffleWinners, users } from '@/server/db/schema';
import { drawWinners, hashSeed, newSeed } from '@/lib/fair';
import { audit } from './audit';
import { publicName } from './people';
import { approvedRoobetUid, wagerTotalFor, wagerTotals, type Metric } from './wagers';

export type Raffle = typeof raffles.$inferSelect;

export const newOverlayToken = () => randomBytes(18).toString('base64url');

export async function getRaffle(id: string) {
  const [row] = await db.select().from(raffles).where(eq(raffles.id, id)).limit(1);
  return row ?? null;
}

export async function getRaffleByToken(token: string) {
  const [row] = await db.select().from(raffles).where(eq(raffles.overlayToken, token)).limit(1);
  return row ?? null;
}

export async function listRaffles() {
  return db.select().from(raffles).orderBy(desc(raffles.startsAt));
}

/** The open raffle, if any. */
export async function openRaffle() {
  const [row] = await db.select().from(raffles).where(eq(raffles.status, 'open')).orderBy(desc(raffles.startsAt)).limit(1);
  return row ?? null;
}

export async function pastRaffles(limit = 6) {
  return db
    .select()
    .from(raffles)
    .where(inArray(raffles.status, ['closed', 'drawn']))
    .orderBy(desc(raffles.endsAt))
    .limit(limit);
}

export const ticketsFor = (raffle: Pick<Raffle, 'usdPerTicket' | 'maxTicketsPerUser'>, wagered: number) =>
  Math.min(raffle.maxTicketsPerUser, Math.floor(wagered / raffle.usdPerTicket));

export type TicketRow = { userId: string; tickets: number; wagered: number; name: string };

/** Live ticket counts from wagers (open raffles), or the frozen snapshot (closed/drawn). */
export async function getTickets(raffle: Raffle): Promise<TicketRow[]> {
  if (raffle.status === 'closed' || raffle.status === 'drawn') {
    const rows = await db
      .select({
        userId: raffleTickets.userId,
        tickets: raffleTickets.tickets,
        wagered: raffleTickets.wagered,
        kickUsername: users.kickUsername,
        discordGlobalName: users.discordGlobalName,
        discordUsername: users.discordUsername,
        nameOnLeaderboards: users.nameOnLeaderboards,
      })
      .from(raffleTickets)
      .innerJoin(users, eq(users.id, raffleTickets.userId))
      .where(eq(raffleTickets.raffleId, raffle.id))
      .orderBy(desc(raffleTickets.tickets));
    return rows.map((r) => ({ userId: r.userId, tickets: r.tickets, wagered: r.wagered, name: publicName(r) }));
  }

  const totals = await wagerTotals(raffle.startsAt, raffle.endsAt, raffle.metric as Metric);
  const members = totals.filter((t) => t.userId && !t.blocked);
  if (!members.length) return [];
  const people = await db
    .select({
      id: users.id,
      kickUsername: users.kickUsername,
      discordGlobalName: users.discordGlobalName,
      discordUsername: users.discordUsername,
      nameOnLeaderboards: users.nameOnLeaderboards,
    })
    .from(users)
    .where(inArray(users.id, members.map((m) => m.userId!)));
  const byId = new Map(people.map((p) => [p.id, p]));
  return members
    .map((m) => ({ userId: m.userId!, tickets: ticketsFor(raffle, m.total), wagered: m.total, name: publicName(byId.get(m.userId!)!) }))
    .filter((t) => t.tickets > 0);
}

/** A member's own position in a raffle: tickets, progress to the next one. */
export async function myRaffleStatus(raffle: Raffle, userId: string) {
  const uid = await approvedRoobetUid(userId);
  if (!uid) return { linked: false as const };
  const wagered = await wagerTotalFor(uid, raffle.startsAt, raffle.endsAt, raffle.metric as Metric);
  const tickets = ticketsFor(raffle, wagered);
  const capped = tickets >= raffle.maxTicketsPerUser;
  const towardNext = wagered - tickets * raffle.usdPerTicket;
  return { linked: true as const, wagered, tickets, capped, towardNext };
}

export async function getRaffleWinners(raffleId: string) {
  const rows = await db
    .select({
      position: raffleWinners.position,
      prize: raffleWinners.prize,
      paidAt: raffleWinners.paidAt,
      userId: raffleWinners.userId,
      kickUsername: users.kickUsername,
      discordGlobalName: users.discordGlobalName,
      discordUsername: users.discordUsername,
      nameOnLeaderboards: users.nameOnLeaderboards,
    })
    .from(raffleWinners)
    .innerJoin(users, eq(users.id, raffleWinners.userId))
    .where(eq(raffleWinners.raffleId, raffleId))
    .orderBy(asc(raffleWinners.position));
  return rows.map((r) => ({ ...r, name: publicName(r) }));
}

/* ------------------------------------------------------------- state changes */

export async function openRaffleDraw(id: string, actorId: string | null) {
  const raffle = await getRaffle(id);
  if (!raffle || raffle.status !== 'draft') return 'not_draft' as const;
  const seed = raffle.seed ?? newSeed();
  await db.update(raffles).set({ status: 'open', seed, seedHash: hashSeed(seed) }).where(eq(raffles.id, id));
  await audit(actorId, 'raffle.open', 'raffle', id, null, { seedHash: hashSeed(seed) });
  return 'ok' as const;
}

/** Freeze tickets. Idempotent. */
export async function closeRaffle(id: string, actorId: string | null) {
  const raffle = await getRaffle(id);
  if (!raffle || raffle.status !== 'open') return 'not_open' as const;
  const tickets = await getTickets(raffle);
  await db.transaction(async (tx) => {
    await tx.delete(raffleTickets).where(eq(raffleTickets.raffleId, id));
    if (tickets.length) {
      await tx.insert(raffleTickets).values(tickets.map((t) => ({ raffleId: id, userId: t.userId, tickets: t.tickets, wagered: t.wagered })));
    }
    await tx.update(raffles).set({ status: 'closed' }).where(eq(raffles.id, id));
  });
  await audit(actorId, 'raffle.close', 'raffle', id, null, {
    players: tickets.length,
    tickets: tickets.reduce((s, t) => s + t.tickets, 0),
  });
  return 'ok' as const;
}

/** Pick winners with the committed seed and reveal it. */
export async function drawRaffle(id: string, actorId: string | null) {
  const raffle = await getRaffle(id);
  if (!raffle || raffle.status !== 'closed' || !raffle.seed) return 'not_closed' as const;
  const entries = await db.select().from(raffleTickets).where(eq(raffleTickets.raffleId, id));
  const winners = drawWinners(
    raffle.seed,
    raffle.id,
    entries.map((e) => ({ id: e.userId, weight: e.tickets })),
    raffle.prizes.length,
  );
  await db.transaction(async (tx) => {
    if (winners.length) {
      await tx.insert(raffleWinners).values(winners.map((userId, i) => ({ raffleId: id, position: i + 1, userId, prize: raffle.prizes[i] ?? 0 })));
    }
    await tx.update(raffles).set({ status: 'drawn', drawnAt: new Date() }).where(eq(raffles.id, id));
  });
  await audit(actorId, 'raffle.draw', 'raffle', id, null, { winners, seed: raffle.seed });
  return 'ok' as const;
}

/** Background job: close open raffles whose window has ended (the draw stays a manual, on-stream action). */
export async function closeEndedRaffles(now = new Date()) {
  const ended = await db
    .select({ id: raffles.id })
    .from(raffles)
    .where(and(eq(raffles.status, 'open'), lte(raffles.endsAt, now)));
  for (const r of ended) await closeRaffle(r.id, null);
  return ended.length;
}
