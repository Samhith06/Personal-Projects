/**
 * Live giveaways: members enter with the site button or the chat keyword
 * (`!join` by default) while a giveaway is open. Eligibility rules are set per
 * giveaway; members blocked from rewards can't enter.
 *
 *   draft → open (seed hash published) → closed (entries frozen) → drawn (seed revealed)
 *
 * With a timer, the close and the draw both happen on their own when it runs out.
 */
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { db } from '@/server/db';
import { giveawayEntries, giveaways, giveawayWinners, users } from '@/server/db/schema';
import { drawWinners, hashSeed, newSeed } from '@/lib/fair';
import { discordAccountCreatedAt } from '@/lib/discord';
import { watchTotals } from '@/server/kick/watchtime';
import { audit } from './audit';
import { personFields, publicName } from './people';
import { approvedRoobetUid } from './wagers';

export type Giveaway = typeof giveaways.$inferSelect;

export type Eligibility = {
  kickLinked?: boolean;
  roobetApproved?: boolean;
  minDiscordAgeDays?: number;
  minWatchMinutes?: number;
};

export async function getGiveaway(id: string) {
  const [row] = await db.select().from(giveaways).where(eq(giveaways.id, id)).limit(1);
  return row ?? null;
}

export async function getGiveawayByToken(token: string) {
  const [row] = await db.select().from(giveaways).where(eq(giveaways.overlayToken, token)).limit(1);
  return row ?? null;
}

export async function listGiveaways() {
  return db.select().from(giveaways).orderBy(desc(giveaways.createdAt));
}

export async function publicGiveaways() {
  const open = await db.select().from(giveaways).where(eq(giveaways.status, 'open')).orderBy(asc(giveaways.closesAt));
  const recent = await db
    .select()
    .from(giveaways)
    .where(and(eq(giveaways.status, 'drawn'), isNotNull(giveaways.drawnAt)))
    .orderBy(desc(giveaways.drawnAt))
    .limit(6);
  return { open, recent };
}

/** Plain-language rule list for cards, e.g. "Kick account linked". */
export function describeEligibility(e: Eligibility) {
  const rules: string[] = [];
  if (e.kickLinked) rules.push('Kick account linked');
  if (e.roobetApproved) rules.push('Roobet username approved');
  if (e.minDiscordAgeDays) rules.push(`Discord account (or SteezySpins account, for Telegram logins) older than ${e.minDiscordAgeDays} days`);
  if (e.minWatchMinutes) rules.push(`At least ${Math.round(e.minWatchMinutes / 60)}h watch time`);
  return rules.length ? rules : ['Open to every member'];
}

/** Reasons the member can't enter (empty = eligible). */
export async function eligibilityProblems(g: Giveaway, userId: string) {
  const e = g.eligibility as Eligibility;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return ['Not signed in'];
  const problems: string[] = [];
  if (user.blockedFromRewards) problems.push('Your account can’t enter giveaways right now');
  if (e.kickLinked && !user.kickUserId) problems.push('Link your Kick account');
  if (e.roobetApproved && !(await approvedRoobetUid(userId))) problems.push('Get your Roobet username approved');
  if (e.minDiscordAgeDays) {
    // Telegram has no account age to read, so Telegram-only members are held to their SteezySpins account's age.
    const created = user.discordId ? discordAccountCreatedAt(user.discordId) : user.createdAt;
    const days = (Date.now() - created.getTime()) / 86_400_000;
    if (days < e.minDiscordAgeDays) {
      problems.push(`Your ${user.discordId ? 'Discord' : 'SteezySpins'} account must be older than ${e.minDiscordAgeDays} days`);
    }
  }
  if (e.minWatchMinutes) {
    const t = await watchTotals(userId);
    if (t.minutes < e.minWatchMinutes) problems.push(`You need ${Math.round(e.minWatchMinutes / 60)}h of watch time`);
  }
  return problems;
}

export type EnterResult = { result: 'entered' | 'already' | 'closed' | 'ineligible'; problems?: string[] };

export async function enterGiveaway(giveawayId: string, userId: string, source: 'site' | 'chat'): Promise<EnterResult> {
  const g = await getGiveaway(giveawayId);
  if (!g || g.status !== 'open' || (g.closesAt && g.closesAt <= new Date())) return { result: 'closed' };
  const problems = await eligibilityProblems(g, userId);
  if (problems.length) return { result: 'ineligible', problems };
  const inserted = await db.insert(giveawayEntries).values({ giveawayId, userId, source }).onConflictDoNothing().returning();
  return { result: inserted.length ? 'entered' : 'already' };
}

/** Chat: `!join` (or the giveaway's own keyword) from a linked Kick account enters every matching open giveaway. */
export async function handleJoinCommand(kickUserId: string, content: string) {
  const word = content.trim().split(/\s+/)[0]?.toLowerCase();
  if (!word?.startsWith('!')) return [];
  const open = await db.select().from(giveaways).where(eq(giveaways.status, 'open'));
  const matching = open.filter((g) => g.entryKeyword && g.entryKeyword.toLowerCase() === word);
  if (!matching.length) return [];
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.kickUserId, kickUserId)).limit(1);
  if (!user) return matching.map(() => ({ result: 'ineligible' as const, problems: ['Link your Kick account'] }));
  return Promise.all(matching.map((g) => enterGiveaway(g.id, user.id, 'chat')));
}

export async function entryCount(giveawayId: string) {
  const [row] = await db.select({ n: count() }).from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
  return row.n;
}

export async function hasEntered(giveawayId: string, userId: string) {
  const [row] = await db
    .select({ id: giveawayEntries.userId })
    .from(giveawayEntries)
    .where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** Entrants' public names, newest first (for the overlay's join feed and draw reel). */
export async function entrantNames(giveawayId: string, limit = 40) {
  const rows = await db
    .select({
      ...personFields,
    })
    .from(giveawayEntries)
    .innerJoin(users, eq(users.id, giveawayEntries.userId))
    .where(eq(giveawayEntries.giveawayId, giveawayId))
    .orderBy(desc(giveawayEntries.createdAt))
    .limit(limit);
  return rows.map(publicName);
}

export async function getGiveawayWinners(giveawayId: string) {
  const rows = await db
    .select({
      position: giveawayWinners.position,
      paidAt: giveawayWinners.paidAt,
      userId: giveawayWinners.userId,
      ...personFields,
    })
    .from(giveawayWinners)
    .innerJoin(users, eq(users.id, giveawayWinners.userId))
    .where(eq(giveawayWinners.giveawayId, giveawayId))
    .orderBy(asc(giveawayWinners.position));
  return rows.map((r) => ({ ...r, name: publicName(r) }));
}

export async function winnersFor(giveawayIds: string[]) {
  if (!giveawayIds.length) return new Map<string, string[]>();
  const rows = await db
    .select({
      giveawayId: giveawayWinners.giveawayId,
      ...personFields,
    })
    .from(giveawayWinners)
    .innerJoin(users, eq(users.id, giveawayWinners.userId))
    .where(inArray(giveawayWinners.giveawayId, giveawayIds))
    .orderBy(asc(giveawayWinners.position));
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.giveawayId, [...(map.get(r.giveawayId) ?? []), publicName(r)]);
  return map;
}

/* ------------------------------------------------------------- state changes */

export async function openGiveaway(id: string, actorId: string | null) {
  const g = await getGiveaway(id);
  if (!g || g.status !== 'draft') return 'not_draft' as const;
  const seed = g.seed ?? newSeed();
  const opensAt = new Date();
  // The timer starts when the giveaway opens, so the countdown matches the stream.
  const closesAt = g.timerMinutes ? new Date(opensAt.getTime() + g.timerMinutes * 60_000) : null;
  await db.update(giveaways).set({ status: 'open', seed, seedHash: hashSeed(seed), opensAt, closesAt }).where(eq(giveaways.id, id));
  await audit(actorId, 'giveaway.open', 'giveaway', id, null, { seedHash: hashSeed(seed) });
  return 'ok' as const;
}

export async function closeGiveaway(id: string, actorId: string | null) {
  const g = await getGiveaway(id);
  if (!g || g.status !== 'open') return 'not_open' as const;
  // Members blocked while the giveaway was open lose their entry here, so the frozen
  // list is exactly what gets drawn and what /fair re-runs.
  const blocked = await db
    .select({ userId: giveawayEntries.userId })
    .from(giveawayEntries)
    .innerJoin(users, eq(users.id, giveawayEntries.userId))
    .where(and(eq(giveawayEntries.giveawayId, id), eq(users.blockedFromRewards, true)));
  if (blocked.length) {
    await db
      .delete(giveawayEntries)
      .where(and(eq(giveawayEntries.giveawayId, id), inArray(giveawayEntries.userId, blocked.map((b) => b.userId))));
  }
  // Guarded on status, so a timer running out and a staff click can't both close it.
  const closed = await db
    .update(giveaways)
    .set({ status: 'closed', closesAt: g.closesAt && g.closesAt < new Date() ? g.closesAt : new Date() })
    .where(and(eq(giveaways.id, id), eq(giveaways.status, 'open')))
    .returning({ id: giveaways.id });
  if (!closed.length) return 'not_open' as const;
  await audit(actorId, 'giveaway.close', 'giveaway', id, null, { entries: await entryCount(id), removedBlocked: blocked.length });
  return 'ok' as const;
}

export async function drawGiveaway(id: string, actorId: string | null) {
  const g = await getGiveaway(id);
  if (!g || g.status !== 'closed' || !g.seed) return 'not_closed' as const;
  // Entries made after the close time (a race with the close) never count.
  const entries = await giveawayDrawEntries(g);
  const winners = drawWinners(g.seed, g.id, entries, g.winnersCount);
  // Claim the draw first: of two simultaneous draws, only one gets the row and inserts winners.
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .update(giveaways)
      .set({ status: 'drawn', drawnAt: new Date() })
      .where(and(eq(giveaways.id, id), eq(giveaways.status, 'closed')))
      .returning({ id: giveaways.id });
    if (!rows.length) return false;
    if (winners.length) await tx.insert(giveawayWinners).values(winners.map((userId, i) => ({ giveawayId: id, position: i + 1, userId })));
    return true;
  });
  if (!claimed) return 'not_closed' as const;
  await audit(actorId, 'giveaway.draw', 'giveaway', id, null, { winners, seed: g.seed, entries: entries.length });
  return 'ok' as const;
}

/**
 * Background job: close and draw every giveaway whose timer has run out. Only
 * open giveaways count, so one staff closed by hand still waits for their draw.
 */
export async function drawExpiredGiveaways(now = new Date()) {
  const expired = await db
    .select({ id: giveaways.id })
    .from(giveaways)
    .where(and(eq(giveaways.status, 'open'), isNotNull(giveaways.closesAt), lte(giveaways.closesAt, now)));
  let drawn = 0;
  for (const g of expired) {
    try {
      if ((await closeGiveaway(g.id, null)) === 'ok' && (await drawGiveaway(g.id, null)) === 'ok') drawn++;
    } catch (error) {
      console.error(`[giveaways] auto-draw failed for ${g.id}; it can be drawn by hand`, error);
    }
  }
  return drawn;
}

/** How long a finished draw holds the permanent overlay: long enough for the reel and the 30 s winner card. */
const LIVE_DRAWN_MS = 45_000;
/** A closed giveaway waiting for its draw stays on the overlay this long, so a forgotten one can't sit there forever. */
const LIVE_CLOSED_MS = 15 * 60_000;

/** The giveaway the permanent OBS link should show right now, if any. */
export async function currentLiveGiveaway(now = new Date()) {
  const rows = await db
    .select()
    .from(giveaways)
    .where(
      or(
        eq(giveaways.status, 'open'),
        and(eq(giveaways.status, 'closed'), gte(giveaways.closesAt, new Date(now.getTime() - LIVE_CLOSED_MS))),
        and(eq(giveaways.status, 'drawn'), gte(giveaways.drawnAt, new Date(now.getTime() - LIVE_DRAWN_MS))),
      ),
    );
  const time = (d: Date | null) => d?.getTime() ?? Infinity;
  // A fresh draw goes first so its winner isn't cut off by the next giveaway opening.
  return (
    rows.filter((g) => g.status === 'drawn').sort((a, b) => time(b.drawnAt) - time(a.drawnAt))[0] ??
    rows.filter((g) => g.status === 'open').sort((a, b) => time(a.closesAt) - time(b.closesAt))[0] ??
    rows.filter((g) => g.status === 'closed').sort((a, b) => time(b.closesAt) - time(a.closesAt))[0] ??
    null
  );
}

/** The entry list a draw used, for public verification. */
export async function giveawayDrawEntries(g: Giveaway) {
  const rows = await db
    .select({ userId: giveawayEntries.userId })
    .from(giveawayEntries)
    .where(and(eq(giveawayEntries.giveawayId, g.id), g.closesAt ? lte(giveawayEntries.createdAt, g.closesAt) : undefined));
  return rows.map((r) => ({ id: r.userId, weight: 1 }));
}
