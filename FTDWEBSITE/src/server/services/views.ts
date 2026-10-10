import 'server-only';
import type { GiveawayWinner } from '@/components/giveaways/GiveawayBoard';
import type { LiveCardStreamer } from '@/components/live/StreamerLiveCard';
import type { Giveaway, Streamer } from '@/server/db/schema';

/** Serialisable streamer shape for client live components. */
export function toLiveCardStreamers(streamers: Streamer[]): LiveCardStreamer[] {
  return streamers.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    monogram: s.monogram,
    role: s.role,
    accent: s.accent,
    isPrimary: s.isPrimary,
    kickUsername: s.kickUsername,
    kickUrl: s.kickUrl,
    avatarUrl: s.avatarUrl,
  }));
}

/** Serialisable giveaway winners for the client slider. */
export function toGiveawayWinners(rows: Giveaway[], streamers: Streamer[]): GiveawayWinner[] {
  const byId = new Map(streamers.map((s) => [s.id, s]));
  return rows.map((g) => {
    const host = g.streamerId ? byId.get(g.streamerId) : undefined;
    return {
      id: g.id,
      handle: g.winnerHandle,
      amount: g.amount,
      kind: g.kind,
      note: g.note,
      occurredAt: g.occurredAt.toISOString(),
      streamerName: host?.displayName ?? null,
      monogram: g.winnerHandle.slice(0, 2).toUpperCase(),
      accent: host?.accent ?? 'gold',
      avatarUrl: null,
    };
  });
}
