/**
 * Bonus hunts (mirrored from bonushunt.gg) and guess-the-balance.
 *
 * Guessing is open while the current hunt is still being collected: it closes by
 * itself the moment the opening starts (`isOpening`), when the hunt completes,
 * or when staff close it. One guess per member — guessing again replaces it.
 * When a hunt completes, the closest guess to the final total wins; on a tie,
 * whoever locked in their final guess first.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { huntGuesses, hunts, users } from '@/server/db/schema';
import { audit } from './audit';
import { publicName } from './people';

export type Hunt = typeof hunts.$inferSelect;
export type HuntBonus = {
  id: string;
  slotName: string;
  provider?: string | null;
  slotImage?: string | null;
  betSize?: number | null;
  payout?: number | null;
  multiplier?: number | null;
  order?: number | null;
};
export type HuntStats = {
  bonusCount?: number | null;
  openedBonuses?: number | null;
  totalWinnings?: number | null;
  profitLoss?: number | null;
  averagePayoutRequired?: number | null;
  currentAverage?: number | null;
  currentAverageMultiplier?: number | null;
};

export const huntBonuses = (h: Hunt) => (h.bonuses ?? []) as HuntBonus[];
export const huntStats = (h: Hunt) => (h.stats ?? {}) as HuntStats;

/** A bonus counts as opened once it has a payout recorded. */
export const isOpened = (b: HuntBonus) => b.payout !== null && b.payout !== undefined;

export function bestMulti(h: Hunt) {
  return huntBonuses(h).reduce((best, b) => (isOpened(b) && (b.multiplier ?? 0) > best ? (b.multiplier ?? 0) : best), 0);
}

export const guessingOpen = (h: Hunt) => !h.completed && !h.isOpening && h.guessesOpen && !h.hidden;

/** The hunt the site, overlay and `!guess` are about: the newest unfinished one, else the newest. */
export async function currentHunt() {
  const [open] = await db
    .select()
    .from(hunts)
    .where(and(eq(hunts.hidden, false), eq(hunts.completed, false)))
    .orderBy(desc(hunts.remoteCreatedAt))
    .limit(1);
  if (open) return open;
  const [last] = await db.select().from(hunts).where(eq(hunts.hidden, false)).orderBy(desc(hunts.remoteCreatedAt)).limit(1);
  return last ?? null;
}

/** A hunt is "on" while it's started on bonushunt.gg and not finished (or hidden by staff). */
export async function activeHunt() {
  const [row] = await db
    .select()
    .from(hunts)
    .where(and(eq(hunts.hidden, false), eq(hunts.completed, false)))
    .orderBy(desc(hunts.remoteCreatedAt))
    .limit(1);
  return row ?? null;
}

export async function getHunt(id: string) {
  const [row] = await db.select().from(hunts).where(eq(hunts.id, id)).limit(1);
  return row ?? null;
}

export async function listHunts(includeHidden = false) {
  return db
    .select()
    .from(hunts)
    .where(includeHidden ? undefined : eq(hunts.hidden, false))
    .orderBy(desc(hunts.remoteCreatedAt));
}

export async function completedHunts(limit = 6) {
  return db
    .select()
    .from(hunts)
    .where(and(eq(hunts.hidden, false), eq(hunts.completed, true)))
    .orderBy(desc(hunts.remoteCreatedAt))
    .limit(limit);
}

/** Best finished hunts by profit, for the Hall of Fame. */
export async function bestHunts(limit = 3) {
  return db
    .select()
    .from(hunts)
    .where(and(eq(hunts.hidden, false), eq(hunts.completed, true), sql`(${hunts.stats}->>'profitLoss')::float8 > 0`))
    .orderBy(sql`(${hunts.stats}->>'profitLoss')::float8 desc`)
    .limit(limit);
}

/* ------------------------------------------------------------------ guesses */

/** "4200", "$4,200", "4.2k", "4200.50" → dollars; null when it isn't a sensible amount. */
export function parseGuess(text: string): number | null {
  const m = /^\$?\s*([\d,]*\.?\d+)\s*(k)?$/i.exec(text.trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
  if (!Number.isFinite(n) || n <= 0 || n >= 10_000_000) return null;
  return Math.round(n * 100) / 100;
}

export type GuessResult = 'saved' | 'updated' | 'closed' | 'blocked' | 'invalid' | 'not_linked' | 'no_hunt';

export async function placeGuess(huntId: string, userId: string, amount: number | null, source: 'site' | 'chat'): Promise<GuessResult> {
  if (amount === null) return 'invalid';
  const hunt = await getHunt(huntId);
  if (!hunt) return 'no_hunt';
  if (!guessingOpen(hunt)) return 'closed';
  const [user] = await db.select({ blocked: users.blockedFromRewards }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.blocked) return 'blocked';

  const [existing] = await db
    .select({ amount: huntGuesses.amount })
    .from(huntGuesses)
    .where(and(eq(huntGuesses.huntId, huntId), eq(huntGuesses.userId, userId)))
    .limit(1);
  await db
    .insert(huntGuesses)
    .values({ huntId, userId, amount, source })
    .onConflictDoUpdate({ target: [huntGuesses.huntId, huntGuesses.userId], set: { amount, source, updatedAt: new Date() } });
  return existing ? 'updated' : 'saved';
}

const GUESS_PATTERN = /^!guess\s+(\S+)/i;

/** Chat: `!guess 4200` from a linked Kick account guesses on the current hunt. */
export async function handleGuessCommand(kickUserId: string, content: string): Promise<GuessResult | null> {
  const m = GUESS_PATTERN.exec(content.trim());
  if (!m) return null;
  const hunt = await currentHunt();
  if (!hunt) return 'no_hunt';
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.kickUserId, kickUserId)).limit(1);
  if (!user) return 'not_linked';
  return placeGuess(hunt.id, user.id, parseGuess(m[1]), 'chat');
}

export async function guessCount(huntId: string) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(huntGuesses).where(eq(huntGuesses.huntId, huntId));
  return row.n;
}

export async function myGuess(huntId: string, userId: string) {
  const [row] = await db
    .select({ amount: huntGuesses.amount, updatedAt: huntGuesses.updatedAt })
    .from(huntGuesses)
    .where(and(eq(huntGuesses.huntId, huntId), eq(huntGuesses.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** All guesses with public names, closest to `target` first when given (admin + results). */
export async function guessList(huntId: string, target?: number | null) {
  const rows = await db
    .select({
      userId: huntGuesses.userId,
      amount: huntGuesses.amount,
      source: huntGuesses.source,
      updatedAt: huntGuesses.updatedAt,
      kickUsername: users.kickUsername,
      discordGlobalName: users.discordGlobalName,
      discordUsername: users.discordUsername,
      nameOnLeaderboards: users.nameOnLeaderboards,
    })
    .from(huntGuesses)
    .innerJoin(users, eq(users.id, huntGuesses.userId))
    .where(eq(huntGuesses.huntId, huntId))
    .orderBy(asc(huntGuesses.updatedAt));
  const list = rows.map((r) => ({ ...r, name: publicName(r) }));
  if (typeof target === 'number') list.sort((a, b) => Math.abs(a.amount - target) - Math.abs(b.amount - target) || a.updatedAt.getTime() - b.updatedAt.getTime());
  return list;
}

/** Pick the closest guess for every completed, unsettled hunt. Called after each sync. */
export async function settleCompletedHunts() {
  const pending = await db
    .select()
    .from(hunts)
    .where(and(eq(hunts.completed, true), eq(hunts.hidden, false), sql`${hunts.settledAt} is null`));
  let settled = 0;
  for (const h of pending) {
    const total = huntStats(h).totalWinnings ?? 0;
    const candidates = (await guessList(h.id, total)).filter(Boolean);
    // Members blocked from rewards can't win.
    const blocked = new Set(
      (await db.select({ id: users.id }).from(users).where(eq(users.blockedFromRewards, true))).map((u) => u.id),
    );
    const winner = candidates.find((c) => !blocked.has(c.userId)) ?? null;
    await db
      .update(hunts)
      .set({ settledAt: new Date(), winnerUserId: winner?.userId ?? null, winnerGuess: winner?.amount ?? null })
      .where(eq(hunts.id, h.id));
    await audit(null, 'hunt.settled', 'hunt', h.id, null, { total, winner: winner?.name ?? null, guess: winner?.amount ?? null, guesses: candidates.length });
    settled++;
  }
  return settled;
}

export async function huntWinnerName(h: Hunt) {
  if (!h.winnerUserId) return null;
  const [u] = await db.select().from(users).where(eq(users.id, h.winnerUserId)).limit(1);
  return u ? publicName(u) : null;
}
