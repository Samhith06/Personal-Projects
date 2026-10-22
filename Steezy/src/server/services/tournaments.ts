/**
 * Slot tournaments (bonushunt.gg's API has none, so they're run here).
 *
 * Single elimination. Each entry is a player and their slot; a match is decided
 * by the higher multiplier. The field is padded to a power of two with byes,
 * and a player facing a bye goes straight through.
 */
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tournamentMatches, tournaments } from '@/server/db/schema';
import { audit } from './audit';

export type Tournament = typeof tournaments.$inferSelect;
export type Match = typeof tournamentMatches.$inferSelect;
export type Entry = { player: string; slot: string };

export const roundName = (round: number, rounds: number) =>
  round === rounds ? 'Final' : round === rounds - 1 ? 'Semifinals' : round === rounds - 2 ? 'Quarterfinals' : `Round ${round}`;

export async function getTournament(id: string) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return t ?? null;
}

export async function listTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
}

/** The tournament to show publicly: a live one, else the latest finished one. */
export async function featuredTournament() {
  const [live] = await db.select().from(tournaments).where(eq(tournaments.status, 'live')).orderBy(desc(tournaments.createdAt)).limit(1);
  if (live) return live;
  const [done] = await db.select().from(tournaments).where(eq(tournaments.status, 'finished')).orderBy(desc(tournaments.createdAt)).limit(1);
  return done ?? null;
}

export async function getMatches(tournamentId: string) {
  return db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.slot));
}

/** Matches grouped by round, with round names. */
export async function bracket(tournamentId: string) {
  const matches = await getMatches(tournamentId);
  const rounds = matches.reduce((m, x) => Math.max(m, x.round), 0);
  return Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    name: roundName(i + 1, rounds),
    matches: matches.filter((m) => m.round === i + 1),
  }));
}

export function matchWinnerName(m: Match) {
  return m.winner === 'a' ? m.playerA : m.winner === 'b' ? m.playerB : null;
}

/** Create a tournament with its whole bracket. Entries keep the order given (that's the seeding). */
export async function createTournament(name: string, prize: string | null, entries: Entry[], actorId: string | null) {
  if (entries.length < 2) throw new Error('A tournament needs at least 2 players.');
  if (entries.length > 64) throw new Error('At most 64 players.');
  let size = 2;
  while (size < entries.length) size *= 2;
  const rounds = Math.log2(size);

  const t = await db.transaction(async (tx) => {
    const [t] = await tx.insert(tournaments).values({ name, prize }).returning();
    const rows: (typeof tournamentMatches.$inferInsert)[] = [];
    for (let r = 1; r <= rounds; r++) {
      for (let s = 0; s < size / 2 ** r; s++) rows.push({ tournamentId: t.id, round: r, slot: s });
    }
    // First round: entry i meets entry size-1-i (1 v last), byes fill the gaps.
    const padded: (Entry | null)[] = [...entries, ...Array(size - entries.length).fill(null)];
    for (let s = 0; s < size / 2; s++) {
      const a = padded[s];
      const b = padded[size - 1 - s];
      Object.assign(rows[s], { playerA: a?.player ?? null, slotA: a?.slot ?? null, playerB: b?.player ?? null, slotB: b?.slot ?? null });
    }
    await tx.insert(tournamentMatches).values(rows);
    return t;
  });
  // Outside the transaction: the audit write uses its own connection.
  await audit(actorId, 'tournament.create', 'tournament', t.id, null, { name, players: entries.length });
  return t;
}

/** Put a winner into the next round's match. */
async function advance(m: Match) {
  const name = matchWinnerName(m);
  const slotName = m.winner === 'a' ? m.slotA : m.slotB;
  const next = await db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, m.tournamentId), eq(tournamentMatches.round, m.round + 1), eq(tournamentMatches.slot, Math.floor(m.slot / 2))))
    .limit(1);
  if (!next[0]) {
    // That was the final.
    await db.update(tournaments).set({ status: 'finished' }).where(eq(tournaments.id, m.tournamentId));
    return;
  }
  const side = m.slot % 2 === 0 ? { playerA: name, slotA: slotName } : { playerB: name, slotB: slotName };
  await db.update(tournamentMatches).set(side).where(eq(tournamentMatches.id, next[0].id));
}

/** Start: byes in round 1 go straight through. */
export async function startTournament(id: string, actorId: string | null) {
  const t = await getTournament(id);
  if (!t || t.status !== 'draft') return 'not_draft' as const;
  await db.update(tournaments).set({ status: 'live' }).where(eq(tournaments.id, id));
  const first = (await getMatches(id)).filter((m) => m.round === 1);
  for (const m of first) {
    if (m.playerA && !m.playerB) await decide(m, 'a');
    else if (!m.playerA && m.playerB) await decide(m, 'b');
  }
  await audit(actorId, 'tournament.start', 'tournament', id);
  return 'ok' as const;
}

async function decide(m: Match, winner: 'a' | 'b', multiA: number | null = null, multiB: number | null = null) {
  const [updated] = await db
    .update(tournamentMatches)
    .set({ winner, multiA, multiB })
    .where(eq(tournamentMatches.id, m.id))
    .returning();
  await advance(updated);
}

export type ResultOutcome = 'ok' | 'not_live' | 'not_ready' | 'decided' | 'tie';

/** Record both multipliers; the higher one wins and moves on. */
export async function recordResult(matchId: string, multiA: number, multiB: number, actorId: string | null): Promise<ResultOutcome> {
  const [m] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId)).limit(1);
  if (!m) return 'not_ready';
  const t = await getTournament(m.tournamentId);
  if (t?.status !== 'live') return 'not_live';
  if (m.winner) return 'decided';
  if (!m.playerA || !m.playerB) return 'not_ready';
  if (multiA === multiB) return 'tie';
  await decide(m, multiA > multiB ? 'a' : 'b', multiA, multiB);
  await audit(actorId, 'tournament.result', 'tournament', m.tournamentId, null, { round: m.round, a: m.playerA, b: m.playerB, multiA, multiB });
  return 'ok';
}
