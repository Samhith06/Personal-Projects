import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { raffleTickets } from '@/server/db/schema';
import { drawWinners, hashSeed } from '@/lib/fair';
import { getGiveaway, getGiveawayWinners, giveawayDrawEntries } from '@/server/services/giveaways';
import { getRaffle, getRaffleWinners } from '@/server/services/raffles';

export const metadata: Metadata = { title: 'Provably fair' };

const UUID = /^[0-9a-f-]{36}$/i;

/** Re-runs a finished draw from its revealed seed and frozen entries, and shows whether it matches. */
async function verify(kind: 'raffle' | 'giveaway', id: string) {
  if (kind === 'raffle') {
    const r = await getRaffle(id);
    if (!r || r.status !== 'drawn' || !r.seed) return null;
    const entries = (await db.select().from(raffleTickets).where(eq(raffleTickets.raffleId, id))).map((t) => ({ id: t.userId, weight: t.tickets }));
    const recorded = await getRaffleWinners(id);
    return { name: r.name, seed: r.seed, seedHash: r.seedHash, entries, picks: r.prizes.length, recorded };
  }
  const g = await getGiveaway(id);
  if (!g || g.status !== 'drawn' || !g.seed) return null;
  const entries = await giveawayDrawEntries(g);
  const recorded = await getGiveawayWinners(id);
  return { name: g.prize, seed: g.seed, seedHash: g.seedHash, entries, picks: g.winnersCount, recorded };
}

export default async function FairPage({ searchParams }: { searchParams: Promise<{ raffle?: string; giveaway?: string }> }) {
  const { raffle, giveaway } = await searchParams;
  const kind = raffle ? 'raffle' : giveaway ? 'giveaway' : null;
  const id = raffle ?? giveaway ?? '';
  const check = kind && UUID.test(id) ? await verify(kind, id) : null;

  let result: { hashOk: boolean; drawOk: boolean; entries: number; weight: number } | null = null;
  if (check) {
    const rerun = drawWinners(check.seed, id, check.entries, check.picks);
    result = {
      hashOk: hashSeed(check.seed) === check.seedHash,
      drawOk: rerun.join() === check.recorded.map((w) => w.userId).join(),
      entries: check.entries.length,
      weight: check.entries.reduce((s, e) => s + e.weight, 0),
    };
  }

  return (
    <div className="container page">
      <article className="prose">
        <span className="kicker">Provably fair</span>
        <h1 className="page__title" style={{ margin: '10px 0 16px' }}>
          How draws work
        </h1>

        {check && result ? (
          <div className="card stack" style={{ gap: 10, marginBottom: 24 }}>
            <strong>Checking: {check.name}</strong>
            <span className={result.hashOk ? 'tag tag--accent' : 'tag tag--danger'} style={{ alignSelf: 'flex-start' }}>
              {result.hashOk ? '✓ Revealed seed matches the fingerprint published before the draw' : '✗ Seed does not match its fingerprint'}
            </span>
            <span className={result.drawOk ? 'tag tag--accent' : 'tag tag--danger'} style={{ alignSelf: 'flex-start' }}>
              {result.drawOk ? '✓ Re-running the draw gives the same winners' : '✗ Re-run gives different winners'}
            </span>
            <span className="meta">
              {result.entries} entries · {result.weight} {kind === 'raffle' ? 'tickets' : 'total weight'} · winners in order:{' '}
              {check.recorded.map((w) => w.name).join(', ') || '—'}
            </span>
            <span className="meta">Seed fingerprint</span>
            <code className="hash">{check.seedHash}</code>
            <span className="meta">Revealed seed</span>
            <code className="hash">{check.seed}</code>
            <a href={`/api/fair/${kind}/${id}`} style={{ fontSize: 14 }}>
              Download the entry list (JSON) to check it yourself
            </a>
          </div>
        ) : kind ? (
          <p className="notice notice--danger">That draw isn&apos;t finished yet, or doesn&apos;t exist.</p>
        ) : null}

        <ol>
          <li>
            When a raffle or giveaway opens, we pick a secret random seed and publish its SHA-256 fingerprint. Changing the seed
            later would change the fingerprint, so it can&apos;t be swapped.
          </li>
          <li>When it closes, the entries are frozen (raffle tickets come from Roobet wagers; each giveaway entry counts once).</li>
          <li>
            Entries are sorted by id. For pick <code>k</code> we compute <code>HMAC-SHA256(seed, &quot;drawId:k&quot;)</code>, take
            its first 52 bits as a number between 0 and 1, multiply by the total tickets and walk the list to find the winner.
            That entry is removed before the next pick.
          </li>
          <li>After the draw we reveal the seed. Anyone can repeat step 3 and get the same winners.</li>
        </ol>
      </article>
    </div>
  );
}
