/**
 * Slot tournaments (bonushunt.gg's API has none, so they're run here),
 * following the MattySpins format.
 *
 *   signup    chat signs up with `!sr <slot>`; sending it again changes the slot
 *   live      the bracket is drawn at random from the sign-ups (up to `size`),
 *             byes go one to a match so no bye meets a bye; each match is one
 *             bonus buy per player and the higher multiplier goes through — a
 *             level result means both buy again. A player who's still in can
 *             `!sr` a new slot before their next match.
 *   finished  the final has a winner
 */
import { randomInt } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { tournamentEntries, tournamentMatches, tournaments } from '@/server/db/schema';
import { audit } from './audit';

export type Tournament = typeof tournaments.$inferSelect;
export type Match = typeof tournamentMatches.$inferSelect;
export type TournamentEntry = typeof tournamentEntries.$inferSelect;

export const TOURNAMENT_SIZES = [4, 8, 16] as const;

/** "Final", "Semi-finals", "Quarter-finals", else "Round 1". */
export function roundName(round: number, rounds: number) {
  const fromEnd = rounds - round;
  return fromEnd === 0 ? 'Final' : fromEnd === 1 ? 'Semi-finals' : fromEnd === 2 ? 'Quarter-finals' : `Round ${round}`;
}

/** The smallest bracket that holds `players`, never below 2 or above `max`. */
export function bracketSize(players: number, max: number) {
  let size = 2;
  while (size < players && size < max) size *= 2;
  return size;
}

/**
 * Round 1's pairs for these (already shuffled) players. Byes go one to a
 * match, in the first matches, so every round-2 match has a real player.
 */
export function firstRound<T>(players: T[], size: number): [T, T | null][] {
  const byes = size - players.length;
  const pairs: [T, T | null][] = [];
  let i = 0;
  for (let m = 0; m < size / 2; m++) {
    if (m < byes) pairs.push([players[i++], null]);
    else {
      pairs.push([players[i], players[i + 1]]);
      i += 2;
    }
  }
  return pairs;
}

/** Fisher–Yates with a CSPRNG, so the draw can't be predicted. */
function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A buy's multiplier to two places, from what it cost and paid. */
export const multiOf = (cost: number, payout: number) => Math.round((payout / cost) * 100) / 100;

/* ------------------------------------------------------------------ reads */

export async function getTournament(id: string) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return t ?? null;
}

export async function listTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
}

/** The tournament to show publicly: one that's running or taking sign-ups, else the latest finished one. */
export async function featuredTournament() {
  const [open] = await db
    .select()
    .from(tournaments)
    .where(inArray(tournaments.status, ['live', 'signup']))
    .orderBy(sql`${tournaments.status} = 'live' desc`, desc(tournaments.createdAt))
    .limit(1);
  if (open) return open;
  const [done] = await db.select().from(tournaments).where(eq(tournaments.status, 'finished')).orderBy(desc(tournaments.finishedAt)).limit(1);
  return done ?? null;
}

export async function getEntries(tournamentId: string) {
  return db.select().from(tournamentEntries).where(eq(tournamentEntries.tournamentId, tournamentId)).orderBy(asc(tournamentEntries.createdAt));
}

export async function getMatches(tournamentId: string) {
  return db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.slot));
}

export function matchWinnerName(m: Match) {
  return m.winner === 'a' ? m.playerA : m.winner === 'b' ? m.playerB : null;
}

/** Both players known and no winner yet. */
export const isPlayable = (m: Match) => !m.winner && Boolean(m.playerA && m.playerB);

/** A level result: both multipliers in, no winner — both buy again. */
export const isLevel = (m: Match) => !m.winner && m.multiA !== null && m.multiB !== null && m.multiA === m.multiB;

export type TournamentSummary = {
  rounds: { round: number; name: string; matches: Match[] }[];
  /** The match being played now: the first playable one, round by round. */
  current: (Match & { roundName: string }) | null;
  champion: string | null;
  runnerUp: string | null;
  /** Players not knocked out yet. */
  alive: number;
  buys: number;
  cost: number;
  payout: number;
};

export function summarise(matches: Match[]): TournamentSummary {
  const roundCount = matches.reduce((m, x) => Math.max(m, x.round), 0);
  const rounds = Array.from({ length: roundCount }, (_, i) => ({
    round: i + 1,
    name: roundName(i + 1, roundCount),
    matches: matches.filter((m) => m.round === i + 1),
  }));
  const next = matches.find(isPlayable);
  const final = rounds.at(-1)?.matches[0];
  const champion = final ? matchWinnerName(final) : null;
  const losers = new Set(matches.filter((m) => m.winner).map((m) => (m.winner === 'a' ? m.playerB : m.playerA)).filter(Boolean));
  const players = new Set(matches.filter((m) => m.round === 1).flatMap((m) => [m.playerA, m.playerB]).filter(Boolean));
  return {
    rounds,
    current: next ? { ...next, roundName: roundName(next.round, roundCount) } : null,
    champion,
    runnerUp: champion && final ? (final.winner === 'a' ? final.playerB : final.playerA) : null,
    alive: [...players].filter((p) => !losers.has(p)).length,
    buys: matches.reduce((s, m) => s + m.buys, 0),
    cost: matches.reduce((s, m) => s + m.cost, 0),
    payout: matches.reduce((s, m) => s + m.payout, 0),
  };
}

/** Finished tournaments for "Past champions", newest first. */
export async function finishedTournaments(limit = 8) {
  const done = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, 'finished'))
    .orderBy(desc(tournaments.finishedAt))
    .limit(limit);
  if (!done.length) return [];
  const all = await db.select().from(tournamentMatches).where(inArray(tournamentMatches.tournamentId, done.map((t) => t.id)));
  return done.map((t) => {
    const s = summarise(all.filter((m) => m.tournamentId === t.id).sort((a, b) => a.round - b.round || a.slot - b.slot));
    const players = new Set(all.filter((m) => m.tournamentId === t.id && m.round === 1).flatMap((m) => [m.playerA, m.playerB]).filter(Boolean));
    return { ...t, champion: s.champion, players: players.size, buys: s.buys, profit: s.payout - s.cost };
  });
}

/* ---------------------------------------------------------------- sign-up */

export async function createTournament(name: string, prize: string | null, size: number, actorId: string | null) {
  const [t] = await db.insert(tournaments).values({ name, prize, size }).returning();
  await audit(actorId, 'tournament.create', 'tournament', t.id, null, { name, size });
  return t;
}

export type SignUpResult =
  | { result: 'entered' | 'changed'; slot: string; count: number; size: number }
  | { result: 'full'; size: number }
  | { result: 'out' }
  | { result: 'closed' };

/**
 * `!sr <slot>` while a tournament is open. During sign-ups it enters the
 * player (or changes their slot); once live it changes the slot of a player
 * who's still in, for their next match.
 */
export async function chatSignUp(t: Tournament, kickUserId: string, kickUsername: string, slot: string): Promise<SignUpResult> {
  if (!t.requestsOpen) return { result: 'closed' };

  if (t.status === 'signup') {
    const entries = await getEntries(t.id);
    const mine = entries.find((e) => e.kickUserId === kickUserId);
    // Sign-ups can run past `size`: the draw picks who plays. Cap it so chat can't grow it without end.
    if (!mine && entries.length >= t.size * 4) return { result: 'full', size: t.size };
    await db
      .insert(tournamentEntries)
      .values({ tournamentId: t.id, kickUserId, kickUsername, slot })
      .onConflictDoUpdate({
        target: [tournamentEntries.tournamentId, tournamentEntries.kickUserId],
        set: { slot, kickUsername, updatedAt: new Date() },
      });
    return { result: mine ? 'changed' : 'entered', slot, count: entries.length + (mine ? 0 : 1), size: t.size };
  }

  if (t.status === 'live') {
    const [entry] = await db
      .select()
      .from(tournamentEntries)
      .where(and(eq(tournamentEntries.tournamentId, t.id), eq(tournamentEntries.kickUserId, kickUserId)))
      .limit(1);
    if (!entry) return { result: 'out' };
    const name = entry.kickUsername;
    const matches = await getMatches(t.id);
    const knockedOut = matches.some((m) => (m.winner === 'a' && m.playerB === name) || (m.winner === 'b' && m.playerA === name));
    if (knockedOut || !matches.some((m) => m.playerA === name || m.playerB === name)) return { result: 'out' };
    await db.update(tournamentEntries).set({ slot, updatedAt: new Date() }).where(eq(tournamentEntries.id, entry.id));
    // Their undecided match (if they're already in one) plays the new slot. A match with a buy in doesn't change.
    await db
      .update(tournamentMatches)
      .set({ slotA: slot })
      .where(and(eq(tournamentMatches.tournamentId, t.id), eq(tournamentMatches.playerA, name), isNull(tournamentMatches.winner), eq(tournamentMatches.buys, 0)));
    await db
      .update(tournamentMatches)
      .set({ slotB: slot })
      .where(and(eq(tournamentMatches.tournamentId, t.id), eq(tournamentMatches.playerB, name), isNull(tournamentMatches.winner), eq(tournamentMatches.buys, 0)));
    return { result: 'changed', slot, count: 0, size: t.size };
  }

  return { result: 'closed' };
}

/** Staff adding a player by hand (no Kick account needed). */
export async function addEntry(tournamentId: string, kickUsername: string, slot: string, actorId: string) {
  const t = await getTournament(tournamentId);
  if (t?.status !== 'signup') return 'not_signup' as const;
  const taken = (await getEntries(tournamentId)).some((e) => e.kickUsername.toLowerCase() === kickUsername.toLowerCase());
  if (taken) return 'taken' as const;
  await db.insert(tournamentEntries).values({ tournamentId, kickUsername, slot });
  await audit(actorId, 'tournament.entry_add', 'tournament', tournamentId, null, { player: kickUsername, slot });
  return 'ok' as const;
}

export async function removeEntry(entryId: string, actorId: string) {
  const [e] = await db.select().from(tournamentEntries).where(eq(tournamentEntries.id, entryId)).limit(1);
  if (!e) return null;
  const t = await getTournament(e.tournamentId);
  if (t?.status !== 'signup') return null;
  await db.delete(tournamentEntries).where(eq(tournamentEntries.id, entryId));
  await audit(actorId, 'tournament.entry_remove', 'tournament', e.tournamentId, { player: e.kickUsername, slot: e.slot }, null);
  return e;
}

/* ------------------------------------------------------------------- play */

/** Draw the bracket from the sign-ups and go live. Byes go straight through. */
export async function startTournament(id: string, actorId: string | null) {
  const t = await getTournament(id);
  if (!t || t.status !== 'signup') return 'not_signup' as const;
  const entries = await getEntries(id);
  if (entries.length < 2) return 'too_few' as const;

  const drawn = shuffle(entries).slice(0, t.size);
  const size = bracketSize(drawn.length, t.size);
  const rounds = Math.log2(size);
  const rows: (typeof tournamentMatches.$inferInsert)[] = [];
  for (let r = 1; r <= rounds; r++) for (let s = 0; s < size / 2 ** r; s++) rows.push({ tournamentId: id, round: r, slot: s });
  firstRound(drawn, size).forEach(([a, b], s) =>
    Object.assign(rows[s], { playerA: a.kickUsername, slotA: a.slot, playerB: b?.kickUsername ?? null, slotB: b?.slot ?? null }),
  );

  await db.transaction(async (tx) => {
    await tx.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, id));
    await tx.insert(tournamentMatches).values(rows);
    await tx.update(tournaments).set({ status: 'live', startedAt: new Date() }).where(eq(tournaments.id, id));
  });
  for (const m of (await getMatches(id)).filter((m) => m.round === 1 && m.playerA && !m.playerB)) await decide(m, 'a');
  await audit(actorId, 'tournament.start', 'tournament', id, null, { signedUp: entries.length, drawn: drawn.length, size });
  return 'ok' as const;
}

/** Put a winner into the next round's match; the final's winner finishes the tournament. */
async function advance(m: Match) {
  const name = matchWinnerName(m);
  const slotName = m.winner === 'a' ? m.slotA : m.slotB;
  const [next] = await db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, m.tournamentId), eq(tournamentMatches.round, m.round + 1), eq(tournamentMatches.slot, Math.floor(m.slot / 2))))
    .limit(1);
  if (!next) {
    await db.update(tournaments).set({ status: 'finished', finishedAt: new Date(), requestsOpen: false }).where(eq(tournaments.id, m.tournamentId));
    return;
  }
  // The player keeps the slot they last chose (it may have changed with !sr since this match was set up).
  const [entry] = await db
    .select({ slot: tournamentEntries.slot })
    .from(tournamentEntries)
    .where(and(eq(tournamentEntries.tournamentId, m.tournamentId), eq(tournamentEntries.kickUsername, name ?? '')))
    .limit(1);
  const slot = entry?.slot ?? slotName;
  const side = m.slot % 2 === 0 ? { playerA: name, slotA: slot } : { playerB: name, slotB: slot };
  await db.update(tournamentMatches).set(side).where(eq(tournamentMatches.id, next.id));
}

async function decide(m: Match, winner: 'a' | 'b') {
  const [updated] = await db.update(tournamentMatches).set({ winner }).where(eq(tournamentMatches.id, m.id)).returning();
  await advance(updated);
}

export type Buy = { cost: number; payout: number };
export type ResultOutcome = 'ok' | 'tie' | 'not_live' | 'not_ready' | 'decided';

/**
 * One buy each: the higher multiplier goes through. A level result is kept
 * (so it shows) and both buy again; the next result replaces it.
 */
export async function recordResult(matchId: string, a: Buy, b: Buy, actorId: string | null): Promise<ResultOutcome> {
  const [m] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId)).limit(1);
  if (!m) return 'not_ready';
  const t = await getTournament(m.tournamentId);
  if (t?.status !== 'live') return 'not_live';
  if (m.winner) return 'decided';
  if (!m.playerA || !m.playerB) return 'not_ready';

  const multiA = multiOf(a.cost, a.payout);
  const multiB = multiOf(b.cost, b.payout);
  const winner = multiA === multiB ? null : multiA > multiB ? 'a' : 'b';
  const [updated] = await db
    .update(tournamentMatches)
    .set({
      multiA,
      multiB,
      winner,
      buys: sql`${tournamentMatches.buys} + 2`,
      cost: sql`${tournamentMatches.cost} + ${a.cost + b.cost}`,
      payout: sql`${tournamentMatches.payout} + ${a.payout + b.payout}`,
    })
    .where(and(eq(tournamentMatches.id, m.id), isNull(tournamentMatches.winner)))
    .returning();
  if (!updated) return 'decided';
  await audit(actorId, 'tournament.result', 'tournament', m.tournamentId, null, { round: m.round, a: m.playerA, b: m.playerB, multiA, multiB });
  if (!winner) return 'tie';
  await advance(updated);
  return 'ok';
}

export async function setRequestsOpen(id: string, open: boolean, actorId: string) {
  await db.update(tournaments).set({ requestsOpen: open }).where(eq(tournaments.id, id));
  await audit(actorId, open ? 'tournament.requests_open' : 'tournament.requests_close', 'tournament', id);
}

/** The tournament `!sr` goes to: taking sign-ups, or live and taking slot changes. */
export async function openForRequests() {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.requestsOpen, true), or(eq(tournaments.status, 'signup'), eq(tournaments.status, 'live'))))
    .orderBy(desc(tournaments.createdAt))
    .limit(1);
  return t ?? null;
}
