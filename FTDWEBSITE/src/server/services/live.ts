/**
 * Live status service.
 *
 * The UI never talks to Kick — it reads this. Sources, in order:
 *   1. Kick's official API, when app credentials are configured.
 *   2. Kick's public channel endpoint (no credentials needed).
 *   3. The last good result, if Kick is briefly unreachable.
 *   4. A deterministic simulator — development fallback only, flagged 'mock'.
 */
import 'server-only';
import { db } from '@/server/db';
import { streamers } from '@/server/db/schema';
import { fetchKickChannels } from '@/server/auth/kick';
import { features } from '@/lib/env';
import type { LiveMap, LiveState } from '@/lib/types';

const TTL_MS = 45_000;

let cache: { at: number; data: LiveMap } | null = null;
let inflight: Promise<LiveMap> | null = null;

/* ------------------------------------------------------- public endpoint */

type PublicChannel = {
  slug: string;
  user?: { profile_pic?: string | null };
  offline_banner_image?: { src?: string | null } | null;
  livestream?: {
    is_live?: boolean;
    session_title?: string | null;
    viewer_count?: number | null;
    start_time?: string | null;
    created_at?: string | null;
    categories?: { name?: string }[];
    thumbnail?: { url?: string | null } | null;
  } | null;
};

/** Kick returns "YYYY-MM-DD HH:MM:SS" in UTC. */
function kickTime(value?: string | null) {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fetchPublicChannel(slug: string): Promise<PublicChannel> {
  const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; FGDR-Live/1.0; +https://fgdr.gg)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Kick channel ${slug} responded ${res.status}`);
  return (await res.json()) as PublicChannel;
}

async function loadFromPublic(rows: { id: string; slug: string }[]): Promise<LiveMap> {
  const results = await Promise.allSettled(rows.map((r) => fetchPublicChannel(r.slug)));
  if (results.every((r) => r.status === 'rejected')) throw new Error('Kick public endpoint unreachable');

  const out: LiveMap = {};
  rows.forEach((row, i) => {
    const result = results[i];
    const previous = cache?.data[row.id];
    if (result.status === 'rejected') {
      // Keep the last known state for this one channel rather than guessing.
      out[row.id] = previous ?? offline(row.id);
      return;
    }
    const c = result.value;
    const l = c.livestream;
    const isLive = Boolean(l?.is_live);
    out[row.id] = {
      streamerId: row.id,
      isLive,
      title: isLive ? (l?.session_title ?? null) : null,
      viewers: isLive ? (l?.viewer_count ?? null) : null,
      category: l?.categories?.[0]?.name ?? null,
      thumbnailUrl: isLive ? (l?.thumbnail?.url ?? null) : null,
      startedAt: isLive ? kickTime(l?.start_time ?? l?.created_at) : null,
      lastLiveAt: null,
      avatarUrl: c.user?.profile_pic ?? null,
      offlineBannerUrl: c.offline_banner_image?.src ?? null,
      source: 'kick',
    };
  });
  return out;
}

const offline = (id: string): LiveState => ({
  streamerId: id,
  isLive: false,
  title: null,
  viewers: null,
  category: null,
  thumbnailUrl: null,
  startedAt: null,
  lastLiveAt: null,
  source: 'kick',
});

/* ------------------------------------------------------------------- mock */

const MOCK_SESSIONS: Record<string, { title: string; category: string; viewers: number; hours: [number, number] }> = {
  fatguysdontrun: { title: 'Bonus hunt — 50 bonuses, all opened live', category: 'Slots & Casino', viewers: 3184, hours: [19, 2] },
  insanetigers7: { title: 'Viewer picks: chat chooses every slot', category: 'Slots & Casino', viewers: 1120, hours: [21, 4] },
  stillmakinggains: { title: 'Grinding the weekly leaderboard', category: 'Slots & Casino', viewers: 640, hours: [17, 21] },
  dallasghost: { title: 'Blackjack & chill — viewer challenge night', category: 'Blackjack', viewers: 1247, hours: [22, 6] },
};

const inWindow = (hour: number, [start, end]: [number, number]) =>
  start <= end ? hour >= start && hour < end : hour >= start || hour < end;

function drift(base: number, seed: number) {
  const t = Date.now() / 60_000;
  const wave = Math.sin(t / 7 + seed) * 0.06 + Math.sin(t / 3 + seed * 2) * 0.03;
  return Math.max(1, Math.round(base * (1 + wave)));
}

function mockLive(ids: string[]): LiveMap {
  const hour = new Date().getHours();
  const out: LiveMap = {};
  ids.forEach((id, index) => {
    const session = MOCK_SESSIONS[id];
    const isLive = session ? inWindow(hour, session.hours) : false;
    out[id] = {
      streamerId: id,
      isLive,
      title: isLive ? (session?.title ?? 'Live now') : null,
      viewers: isLive ? drift(session?.viewers ?? 500, index + 1) : null,
      category: session?.category ?? 'Slots & Casino',
      thumbnailUrl: null,
      startedAt: isLive ? new Date(Date.now() - (40 + ((index * 37) % 180)) * 60_000).toISOString() : null,
      lastLiveAt: isLive ? null : new Date(Date.now() - (14 + index * 9) * 3_600_000).toISOString(),
      source: 'mock',
    };
  });
  return out;
}

/* ------------------------------------------------------------------ load */

async function loadLive(): Promise<LiveMap> {
  const rows = await db.select({ id: streamers.id, slug: streamers.kickUsername }).from(streamers);
  const ids = rows.map((r) => r.id);

  if (features.kickApi) {
    try {
      const channels = await fetchKickChannels(rows.map((r) => r.slug));
      if (channels) {
        const bySlug = new Map(channels.map((c) => [c.slug.toLowerCase(), c]));
        const out: LiveMap = {};
        for (const row of rows) {
          const c = bySlug.get(row.slug.toLowerCase());
          out[row.id] = {
            streamerId: row.id,
            isLive: c?.isLive ?? false,
            title: c?.title ?? null,
            viewers: c?.viewers ?? null,
            category: c?.category ?? null,
            thumbnailUrl: c?.thumbnailUrl ?? null,
            startedAt: c?.startedAt ?? null,
            lastLiveAt: null,
            avatarUrl: cache?.data[row.id]?.avatarUrl ?? null,
            offlineBannerUrl: c?.bannerUrl ?? null,
            source: 'kick',
          };
        }
        return out;
      }
    } catch (error) {
      console.error('[live] Kick API failed, trying public endpoint', error);
    }
  }

  try {
    return await loadFromPublic(rows);
  } catch (error) {
    console.error('[live] Kick unreachable', error);
    return cache?.data ?? mockLive(ids);
  }
}

/** Cached live map. Concurrent callers share one upstream request. */
export async function getLiveStatus(): Promise<LiveMap> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (inflight) return inflight;

  inflight = loadLive()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function liveCount(live: LiveMap) {
  return Object.values(live).filter((s) => s.isLive).length;
}
