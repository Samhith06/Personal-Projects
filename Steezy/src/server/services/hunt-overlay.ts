/** State for the OBS bonus hunt overlay: the current hunt, guess count, and the leaderboard ticker. */
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { settings } from '@/server/db/schema';
import { currentLeaderboard, getStandings } from './leaderboards';
import { bestMulti, currentHunt, guessCount, guessingOpen, huntBonuses, huntStats, huntWinnerName } from './hunts';

const TOKEN_KEY = 'hunt.overlayToken';

/** The hunt overlay's secret URL token, created on first use. */
export async function huntOverlayToken() {
  const [row] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1);
  if (row) return row.value as string;
  const token = randomBytes(18).toString('base64url');
  await db.insert(settings).values({ key: TOKEN_KEY, value: token }).onConflictDoNothing();
  const [again] = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1);
  return again.value as string;
}

export type HuntOverlayState = {
  hunt: {
    title: string;
    casino: string | null;
    startCost: number;
    won: number;
    opened: number;
    total: number;
    best: number;
    avgNeeded: number | null;
    status: 'collecting' | 'opening' | 'finished';
    slots: { id: string; name: string; bet: number | null; multi: number | null; current: boolean; opened: boolean }[];
  } | null;
  guess: { open: boolean; count: number; winner: string | null };
  ticker: { name: string; rank: number; wagered: number }[];
  boardName: string | null;
};

export async function huntOverlayState(token: string): Promise<HuntOverlayState | null> {
  if (token !== (await huntOverlayToken())) return null;
  const [hunt, board] = await Promise.all([currentHunt(), currentLeaderboard()]);
  const standings = board ? (await getStandings(board)).slice(0, 5) : [];

  if (!hunt) return { hunt: null, guess: { open: false, count: 0, winner: null }, ticker: standings.map((s) => ({ name: s.displayName, rank: s.rank, wagered: s.wagered })), boardName: board?.name ?? null };

  const s = huntStats(hunt);
  const bonuses = huntBonuses(hunt);
  const [count, winner] = await Promise.all([guessCount(hunt.id), huntWinnerName(hunt)]);
  return {
    hunt: {
      title: hunt.title,
      casino: hunt.casino,
      startCost: hunt.startCost,
      won: s.totalWinnings ?? 0,
      opened: s.openedBonuses ?? 0,
      total: s.bonusCount ?? bonuses.length,
      best: bestMulti(hunt),
      avgNeeded: s.averagePayoutRequired ?? null,
      status: hunt.completed ? 'finished' : hunt.isOpening ? 'opening' : 'collecting',
      slots: bonuses.map((b) => ({
        id: b.id,
        name: b.slotName,
        bet: b.betSize ?? null,
        multi: b.multiplier ?? null,
        current: hunt.currentOpeningSlot === b.id,
        opened: b.payout !== null && b.payout !== undefined,
      })),
    },
    guess: { open: guessingOpen(hunt), count, winner },
    ticker: standings.map((st) => ({ name: st.displayName, rank: st.rank, wagered: st.wagered })),
    boardName: board?.name ?? null,
  };
}
