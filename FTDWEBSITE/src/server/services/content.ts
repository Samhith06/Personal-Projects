/**
 * Content access layer.
 *
 * Pages and components read through these functions only — never the database
 * directly. That keeps presentation free of query logic and means the storage
 * behind any one section can change without touching the UI.
 */
import 'server-only';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  activity,
  announcements,
  challenges,
  clips,
  communityStats,
  giveaways,
  leaderboardBoards,
  leaderboardEntries,
  milestones,
  pastStreams,
  raffles,
  siteSettings,
  streamers,
  wins,
  type Clip,
  type Giveaway,
  type SiteSettings,
  type Streamer,
  type Win,
} from '@/server/db/schema';
import type { ClipPlatform, PlayableMedia } from '@/lib/types';

/* ------------------------------------------------------------------- site */

const DEFAULT_HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4';

export async function getSiteSettings(): Promise<SiteSettings> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).limit(1);
  if (row) return row;
  // The site still renders before the first seed/admin save.
  return {
    id: 'default',
    heroTitle: 'FatGuysDontRun',
    heroTagline: 'One crew. Every creator. One community.',
    heroVideoUrl: DEFAULT_HERO_VIDEO,
    heroPosterUrl: '/brand/hero2-poster.jpg',
    featuredStreamerId: null,
    featuredChallengeId: null,
    featuredRaffleId: null,
    featuredAnnouncementId: null,
    featuredClipIds: '[]',
    featuredWinIds: '[]',
    giveawayBaseline: 0,
    giveawayNote: '',
    discordUrl: '#',
    xUrl: '#',
    instagramUrl: '#',
    youtubeUrl: '#',
    stakeUrl: '#',
    updatedAt: new Date(),
  } satisfies SiteSettings;
}

export function parseIdList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------- streamers */

/**
 * The crew. Hidden channels are left out unless asked for — the admin panel
 * asks, so a hidden channel can always be found and switched back on.
 */
export async function getStreamers({ includeHidden = false } = {}): Promise<Streamer[]> {
  return db
    .select()
    .from(streamers)
    .where(includeHidden ? undefined : eq(streamers.isActive, true))
    .orderBy(asc(streamers.sortOrder));
}

export async function getStreamer(id: string): Promise<Streamer | null> {
  const [row] = await db.select().from(streamers).where(eq(streamers.id, id)).limit(1);
  return row ?? null;
}

export async function getStreamerMap() {
  const rows = await getStreamers();
  return new Map(rows.map((s) => [s.id, s]));
}

export async function getPastStreams(streamerId: string, limit = 6) {
  return db
    .select()
    .from(pastStreams)
    .where(eq(pastStreams.streamerId, streamerId))
    .orderBy(desc(pastStreams.airedAt))
    .limit(limit);
}

/* ------------------------------------------------------------------- clips */

type ClipQuery = { platform?: ClipPlatform | 'all'; streamerId?: string; limit?: number };

export async function getClips({ platform = 'all', streamerId, limit = 60 }: ClipQuery = {}) {
  const filters = [eq(clips.status, 'approved')];
  if (platform !== 'all') filters.push(eq(clips.platform, platform));
  if (streamerId) filters.push(eq(clips.streamerId, streamerId));

  return db
    .select()
    .from(clips)
    .where(and(...filters))
    .orderBy(desc(clips.publishedAt))
    .limit(limit);
}

/** Homepage clips: exactly what an admin marked as featured, in their order. */
export async function getFeaturedClips(limit = 4) {
  const settings = await getSiteSettings();
  const ids = parseIdList(settings.featuredClipIds);

  if (ids.length) {
    const rows = await db
      .select()
      .from(clips)
      .where(and(eq(clips.status, 'approved'), inArray(clips.id, ids)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter((c): c is Clip => Boolean(c));
    if (ordered.length) return ordered.slice(0, limit);
  }

  return db
    .select()
    .from(clips)
    .where(and(eq(clips.status, 'approved'), eq(clips.isFeatured, true)))
    .orderBy(asc(clips.featuredOrder))
    .limit(limit);
}

/* ------------------------------------------------------------ wall of fame */

type WinQuery = { sort?: 'payout' | 'multiplier' | 'latest'; streamerId?: string; limit?: number };

export async function getWins({ sort = 'payout', streamerId, limit = 40 }: WinQuery = {}) {
  const filters = [eq(wins.status, 'approved')];
  if (streamerId) filters.push(eq(wins.streamerId, streamerId));

  const order =
    sort === 'latest'
      ? desc(wins.occurredAt)
      : sort === 'multiplier'
        ? desc(sql`cast(${wins.payout} as real) / max(${wins.bet}, 1)`)
        : desc(wins.payout);

  return db
    .select()
    .from(wins)
    .where(and(...filters))
    .orderBy(order)
    .limit(limit);
}

export async function getFeaturedWins(limit = 3) {
  const settings = await getSiteSettings();
  const ids = parseIdList(settings.featuredWinIds);

  if (ids.length) {
    const rows = await db
      .select()
      .from(wins)
      .where(and(eq(wins.status, 'approved'), inArray(wins.id, ids)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter((w): w is Win => Boolean(w));
    if (ordered.length) return ordered.slice(0, limit);
  }

  return getWins({ sort: 'payout', limit });
}

/* ------------------------------------------------------------- leaderboard */

/**
 * One board per Stake site. Each runs its own race with its own prizes, fed by
 * that site's affiliate API (see `leaderboard-sync.ts`). The first is the board
 * a visitor lands on.
 */
export const LEADERBOARD_SITES = ['stake-com', 'stake-eu'] as const;

export type LeaderboardSite = (typeof LEADERBOARD_SITES)[number];

export const LEADERBOARD_SITE_LABEL: Record<LeaderboardSite, string> = { 'stake-com': 'Stake.com', 'stake-eu': 'Stake.eu' };

export const DEFAULT_LEADERBOARD_SITE: LeaderboardSite = 'stake-com';

export function isLeaderboardSite(value: string | undefined): value is LeaderboardSite {
  return LEADERBOARD_SITES.includes(value as LeaderboardSite);
}

export async function getLeaderboard(period: LeaderboardSite = DEFAULT_LEADERBOARD_SITE, limit = 25) {
  const [board] = await db.select().from(leaderboardBoards).where(eq(leaderboardBoards.period, period)).limit(1);
  const entries = await db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.period, period))
    .orderBy(asc(leaderboardEntries.rank))
    .limit(limit);
  return { board: board ?? null, entries };
}

/** The member's row on each board they appear on. */
export async function getMemberLeaderboardPositions(userId: string) {
  const rows = await db
    .select()
    .from(leaderboardEntries)
    .where(and(inArray(leaderboardEntries.period, LEADERBOARD_SITES), eq(leaderboardEntries.userId, userId)));
  return LEADERBOARD_SITES.flatMap((site) => {
    const row = rows.find((r) => r.period === site);
    return row ? [{ site, entry: row }] : [];
  });
}

/* ----------------------------------------------------- raffles / challenges */

export async function getRaffles(status?: 'active' | 'upcoming' | 'ended') {
  const query = db.select().from(raffles);
  const rows = status ? await query.where(eq(raffles.status, status)) : await query;
  const rank = { active: 0, upcoming: 1, ended: 2 } as const;
  return rows.sort(
    (a, b) =>
      rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank] ||
      a.endsAt.getTime() - b.endsAt.getTime(),
  );
}

export async function getFeaturedRaffle() {
  const settings = await getSiteSettings();
  if (settings.featuredRaffleId) {
    const [row] = await db.select().from(raffles).where(eq(raffles.id, settings.featuredRaffleId)).limit(1);
    if (row) return row;
  }
  const [fallback] = await db
    .select()
    .from(raffles)
    .where(eq(raffles.status, 'active'))
    .orderBy(asc(raffles.endsAt))
    .limit(1);
  return fallback ?? null;
}

export async function getChallenges(status?: 'active' | 'upcoming' | 'completed') {
  const rows = status
    ? await db.select().from(challenges).where(eq(challenges.status, status))
    : await db.select().from(challenges);
  const rank = { active: 0, upcoming: 1, completed: 2 } as const;
  return rows.sort(
    (a, b) =>
      rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank] ||
      a.endsAt.getTime() - b.endsAt.getTime(),
  );
}

export async function getFeaturedChallenge() {
  const settings = await getSiteSettings();
  if (settings.featuredChallengeId) {
    const [row] = await db.select().from(challenges).where(eq(challenges.id, settings.featuredChallengeId)).limit(1);
    if (row) return row;
  }
  const [fallback] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, 'active'))
    .orderBy(asc(challenges.endsAt))
    .limit(1);
  return fallback ?? null;
}

export async function getMilestones() {
  return db.select().from(milestones).orderBy(asc(milestones.sortOrder));
}

/* -------------------------------------------------------------- giveaways */

export async function getGiveaways(limit = 60): Promise<Giveaway[]> {
  return db.select().from(giveaways).orderBy(desc(giveaways.occurredAt)).limit(limit);
}

/**
 * The headline number.
 *
 * Everything logged on the board, plus whatever the crew handed out before it
 * existed (`giveawayBaseline`). Summed in SQL so the figure stays right no
 * matter how many rows pile up.
 */
export async function getGiveawayTotal() {
  const [settings, [row]] = await Promise.all([
    getSiteSettings(),
    db.select({ total: sql<number>`coalesce(sum(${giveaways.amount}), 0)`, count: sql<number>`count(*)` }).from(giveaways),
  ]);
  const logged = Number(row?.total ?? 0);
  return {
    total: settings.giveawayBaseline + logged,
    logged,
    baseline: settings.giveawayBaseline,
    count: Number(row?.count ?? 0),
    note: settings.giveawayNote,
  };
}

/* --------------------------------------------------------------- community */

export async function getActivity(limit = 8) {
  return db.select().from(activity).orderBy(desc(activity.occurredAt)).limit(limit);
}

export async function getFeaturedAnnouncement() {
  const settings = await getSiteSettings();
  if (settings.featuredAnnouncementId) {
    const [row] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, settings.featuredAnnouncementId))
      .limit(1);
    if (row) return row;
  }
  const [fallback] = await db.select().from(announcements).orderBy(desc(announcements.publishedAt)).limit(1);
  return fallback ?? null;
}

export async function getAnnouncements(limit = 10) {
  return db.select().from(announcements).orderBy(desc(announcements.publishedAt)).limit(limit);
}

export async function getCommunityStats() {
  return db.select().from(communityStats).orderBy(asc(communityStats.sortOrder));
}

/* ------------------------------------------------------- media view models */

export function clipToMedia(clip: Clip, streamer: Streamer | undefined): PlayableMedia {
  return {
    id: clip.id,
    kind: 'clip',
    title: clip.title,
    streamerId: clip.streamerId,
    streamerName: streamer?.displayName ?? clip.streamerId,
    platform: clip.platform as ClipPlatform,
    url: clip.url,
    mediaUrl: clip.mediaUrl,
    embedUrl: clip.embedUrl,
    thumbnailUrl: clip.thumbnailUrl,
    orientation: clip.orientation === 'portrait' ? 'portrait' : 'landscape',
    durationSec: clip.durationSec,
    views: clip.views,
    publishedAt: clip.publishedAt.toISOString(),
    accent: streamer?.accent ?? 'gold',
  };
}

export function winToMedia(win: Win, streamer: Streamer | undefined): PlayableMedia {
  return {
    id: win.id,
    kind: 'win',
    title: win.game,
    streamerId: win.streamerId,
    streamerName: streamer?.displayName ?? win.streamerId,
    platform: 'kick',
    url: win.url,
    mediaUrl: win.mediaUrl,
    embedUrl: win.embedUrl,
    thumbnailUrl: win.thumbnailUrl,
    orientation: 'landscape',
    durationSec: null,
    views: null,
    publishedAt: win.occurredAt.toISOString(),
    accent: streamer?.accent ?? 'gold',
    payout: win.payout,
    bet: win.bet,
    game: win.game,
    provider: win.provider,
    description: win.description,
  };
}

/** Related clips for the "next / previous" controls in the mini-player. */
export async function getSiblingClipIds(clipId: string, limit = 12) {
  const rows = await db
    .select({ id: clips.id })
    .from(clips)
    .where(and(eq(clips.status, 'approved'), ne(clips.id, clipId)))
    .orderBy(desc(clips.publishedAt))
    .limit(limit);
  return rows.map((r) => r.id);
}
