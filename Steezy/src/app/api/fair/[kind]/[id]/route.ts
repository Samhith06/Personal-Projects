import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { raffleTickets } from '@/server/db/schema';
import { getGiveaway, getGiveawayWinners, giveawayDrawEntries } from '@/server/services/giveaways';
import { getRaffle, getRaffleWinners } from '@/server/services/raffles';

/**
 * Everything needed to re-run a finished draw offline: seed, fingerprint, the
 * frozen entries (opaque member ids + weights) and the recorded winners.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (kind === 'raffle') {
    const r = await getRaffle(id);
    if (!r || r.status !== 'drawn') return NextResponse.json({ error: 'not drawn' }, { status: 404 });
    const entries = (await db.select().from(raffleTickets).where(eq(raffleTickets.raffleId, id))).map((t) => ({ id: t.userId, weight: t.tickets }));
    const winners = (await getRaffleWinners(id)).map((w) => w.userId);
    return NextResponse.json({ drawId: id, seed: r.seed, seedHash: r.seedHash, picks: r.prizes.length, entries, winners });
  }
  if (kind === 'giveaway') {
    const g = await getGiveaway(id);
    if (!g || g.status !== 'drawn') return NextResponse.json({ error: 'not drawn' }, { status: 404 });
    const winners = (await getGiveawayWinners(id)).map((w) => w.userId);
    return NextResponse.json({ drawId: id, seed: g.seed, seedHash: g.seedHash, picks: g.winnersCount, entries: await giveawayDrawEntries(g), winners });
  }
  return NextResponse.json({ error: 'not found' }, { status: 404 });
}
