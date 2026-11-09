/** State the OBS draw overlay polls. Only public information: names, counts, prizes. */
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { settings } from '@/server/db/schema';
import { formatUsd, ordinal } from '@/lib/format';
import { currentLiveGiveaway, entrantNames, entryCount, getGiveawayByToken, getGiveawayWinners, type Giveaway } from './giveaways';
import { getRaffleByToken, getRaffleWinners, getTickets, newOverlayToken } from './raffles';

/** Names the overlay's scrolling join list can show. */
const MAX_NAMES = 200;

export type OverlayState = {
  kind: 'giveaway' | 'raffle';
  title: string;
  prizes: string[];
  status: string;
  keyword: string | null;
  closesAt: string | null;
  entries: number;
  entriesLabel: string;
  players: number;
  /** Everyone who joined (newest first), for the scrolling list. */
  recent: string[];
  reel: string[];
  winners: { name: string; prize: string }[];
  drawnAt: string | null;
};

/** What the permanent link shows between giveaways: nothing. */
const IDLE: OverlayState = {
  kind: 'giveaway',
  title: '',
  prizes: [],
  status: 'idle',
  keyword: null,
  closesAt: null,
  entries: 0,
  entriesLabel: 'Entries',
  players: 0,
  recent: [],
  reel: [],
  winners: [],
  drawnAt: null,
};

const LIVE_TOKEN_KEY = 'giveaway_live_overlay_token';

async function storedLiveToken() {
  const [row] = await db.select().from(settings).where(eq(settings.key, LIVE_TOKEN_KEY)).limit(1);
  return (row?.value as { token?: string } | undefined)?.token ?? null;
}

/** Secret for the one OBS link that covers every giveaway. Created the first time staff need it. */
export async function liveOverlayToken() {
  const existing = await storedLiveToken();
  if (existing) return existing;
  await db.insert(settings).values({ key: LIVE_TOKEN_KEY, value: { token: newOverlayToken() } }).onConflictDoNothing();
  return (await storedLiveToken())!;
}

async function giveawayState(g: Giveaway): Promise<OverlayState> {
  const [count, names, winners] = await Promise.all([entryCount(g.id), entrantNames(g.id, MAX_NAMES), getGiveawayWinners(g.id)]);
  return {
    kind: 'giveaway',
    title: g.prize,
    prizes: [g.prize],
    status: g.status,
    keyword: g.entryKeyword,
    closesAt: g.closesAt?.toISOString() ?? null,
    entries: count,
    entriesLabel: 'Entries',
    players: count,
    recent: names,
    reel: names,
    winners: winners.map((w) => ({ name: w.name, prize: g.winnersCount > 1 ? `${ordinal(w.position)} winner` : g.prize })),
    drawnAt: g.drawnAt?.toISOString() ?? null,
  };
}

export async function overlayState(kind: string, token: string): Promise<OverlayState | null> {
  if (kind === 'live') {
    if (token !== (await storedLiveToken())) return null;
    const g = await currentLiveGiveaway();
    return g ? giveawayState(g) : IDLE;
  }
  if (kind === 'giveaway') {
    const g = await getGiveawayByToken(token);
    return g ? giveawayState(g) : null;
  }
  if (kind === 'raffle') {
    const r = await getRaffleByToken(token);
    if (!r) return null;
    const [tickets, winners] = await Promise.all([getTickets(r), getRaffleWinners(r.id)]);
    return {
      kind: 'raffle',
      title: r.name,
      prizes: r.prizes.map((p, i) => `${ordinal(i + 1)} · ${formatUsd(p)}`),
      status: r.status,
      keyword: null,
      closesAt: r.endsAt.toISOString(),
      entries: tickets.reduce((s, t) => s + t.tickets, 0),
      entriesLabel: 'Tickets',
      players: tickets.length,
      recent: tickets.slice(0, MAX_NAMES).map((t) => `${t.name} · ${t.tickets}`),
      reel: tickets.map((t) => t.name),
      winners: winners.map((w) => ({ name: w.name, prize: `${ordinal(w.position)} · ${formatUsd(w.prize)}` })),
      drawnAt: r.drawnAt?.toISOString() ?? null,
    };
  }
  return null;
}
