/** State the OBS draw overlay polls. Only public information: names, counts, prizes. */
import { formatUsd, ordinal } from '@/lib/format';
import { entrantNames, entryCount, getGiveawayByToken, getGiveawayWinners } from './giveaways';
import { getRaffleByToken, getRaffleWinners, getTickets } from './raffles';

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

export async function overlayState(kind: string, token: string): Promise<OverlayState | null> {
  if (kind === 'giveaway') {
    const g = await getGiveawayByToken(token);
    if (!g) return null;
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
