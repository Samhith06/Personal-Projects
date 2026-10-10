'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, desc, eq, gt, isNull, sql as sqlExpr } from 'drizzle-orm';
import { z } from 'zod';
import { BONUS_KINDS } from '@/lib/bonus-hunt';
import { usd } from '@/lib/format';
import { GIVEAWAY_KINDS } from '@/lib/giveaways';
import { db } from '@/server/db';
import {
  activity,
  announcements,
  bonusHuntBonuses,
  bonusHuntCalls,
  bonusHuntGuesses,
  bonusHunts,
  challenges,
  clips,
  communityStats,
  giveaways,
  leaderboardBoards,
  leaderboardEntries,
  milestones,
  raffleEntries,
  raffles,
  siteSettings,
  streamers,
  users,
  wins,
} from '@/server/db/schema';
import {
  PermissionError,
  assertChannel,
  requireMaster,
  requireStaff,
  type Staff,
} from '@/server/auth/permissions';
import { ensureChatWatcher } from '@/server/kick/chat-watcher';
import { rankGuesses } from '@/server/services/bonus-hunt';
import { LEADERBOARD_SITES } from '@/server/services/content';
import { ladderTotal, parsePrizeLadder } from '@/server/services/leaderboard-sync';
import type { ActionState } from './member';

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

/** A validation problem to show the user as-is. */
class FormError extends Error {}

async function run(fn: () => Promise<string>): Promise<ActionState> {
  try {
    const message = await fn();
    revalidatePath('/', 'layout');
    return { ok: true, message };
  } catch (error) {
    if (error instanceof PermissionError || error instanceof FormError) return { ok: false, message: error.message };
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? 'Check the form and try again.' };
    console.error('[admin] action failed', error);
    return { ok: false, message: 'Something went wrong saving that. Please try again.' };
  }
}

const data = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));

const text = (max: number, label: string) => z.string().trim().max(max, `${label} is too long.`);
const required = (max: number, label: string) => text(max, label).min(1, `${label} is required.`);
const optional = (max: number, label: string) =>
  text(max, label)
    .optional()
    .transform((v) => (v ? v : null));
const url = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === '#' || /^(https:\/\/|\/)[^\s]+$/i.test(v), `${label} must start with https://`)
    .transform((v) => (v ? v : null));
const socialUrl = (label: string) => url(label).transform((v) => v ?? '#');
const int = (label: string, min = 0) =>
  z
    .preprocess(
      // An empty box means "leave it at the floor", not "reject the whole form".
      (v) => (typeof v === 'string' && v.trim() === '' ? min : v),
      z.coerce.number({ message: `${label} must be a number.` }),
    )
    .refine((n) => Number.isInteger(n), `${label} must be a whole number.`)
    .refine((n) => n >= min, `${label} is too small.`);
const optionalInt = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(/[,$\s]/g, ''));
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: 'custom', message: `${label} must be a number.` });
        return z.NEVER;
      }
      return Math.round(n);
    });
/**
 * A money amount.
 *
 * Kept to two decimals rather than whole dollars: a $0.20 spin and a $0.10 tip
 * are ordinary here, and rounding them would turn them into $0. An empty field
 * means zero — admins shouldn't have to type "0" into every box to save a form.
 */
const money = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return 0;
      const n = Number(v.replace(/[,$\s]/g, ''));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an amount — for example 0.20 or 1,500.` });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    });

/** The same, but the field genuinely has to be filled in. */
const requiredMoney = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = Number(v.replace(/[,$\s]/g, ''));
      if (!v || !Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an amount greater than zero.` });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    });
const date = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .transform((v, ctx) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: `${label} is not a valid date.` });
        return z.NEVER;
      }
      return d;
    });
const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: `${label} is not a valid date.` });
        return z.NEVER;
      }
      return d;
    });
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'on' || v === 'true');
const oneOf = <T extends string>(values: readonly [T, ...T[]], label: string) =>
  z.enum(values, { message: `Choose a valid ${label}.` });

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/** The four accent colours a channel can be themed with. */
const ACCENTS = ['gold', 'cyan', 'steel', 'ruby'] as const;

/** Loads an existing row's channel and checks the staff member may touch it. */
async function assertExisting(staff: Staff, channel: string | null | undefined, exists: boolean) {
  if (!exists) throw new PermissionError('That item no longer exists.');
  assertChannel(staff, channel);
}

/** Creators can't create crew-wide items; masters can. */
function assertHost(staff: Staff, hostId: string | null) {
  if (!hostId && !staff.isMaster) throw new PermissionError('Choose your channel as the host.');
  if (hostId) assertChannel(staff, hostId);
}

async function logActivity(type: string, title: string, tag: string, href: string) {
  await db.insert(activity).values({ id: newId('ac'), type, title, tag, href, occurredAt: new Date() });
}

/** Turn a normal YouTube / Instagram link into an embeddable player URL. */
function deriveEmbed(platform: string, link: string | null) {
  if (!link) return null;
  try {
    const u = new URL(link);
    if (platform === 'youtube') {
      const id =
        u.hostname.includes('youtu.be')
          ? u.pathname.slice(1)
          : u.pathname.startsWith('/shorts/')
            ? u.pathname.split('/')[2]
            : u.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (platform === 'instagram') {
      const m = u.pathname.match(/\/(reel|p)\/([^/]+)/);
      return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                   profile                                  */
/* -------------------------------------------------------------------------- */

export async function saveProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        streamerId: required(60, 'Channel'),
        displayName: required(60, 'Display name'),
        kickUsername: required(60, 'Kick username'),
        role: text(60, 'Role'),
        accent: oneOf(ACCENTS, 'accent colour'),
        tagline: text(160, 'Headline'),
        quote: text(160, 'Quote'),
        bio: text(1000, 'Bio'),
        chapterTitle: text(40, 'Chapter title'),
        specialty: text(80, 'Specialty'),
        biggestWin: money('Biggest win'),
        biggestWinGame: text(60, 'Biggest win game'),
        followers: int('Followers'),
        avgViewers: int('Average viewers'),
        peakViewers: int('Peak viewers'),
        streamsThisMonth: int('Streams this month'),
        allTimeWager: money('All-time wagered'),
        rafflesHosted: int('Raffles hosted'),
        portraitUrl: url('Portrait image'),
        avatarUrl: url('Avatar image'),
        bannerUrl: url('Banner image'),
        xUrl: socialUrl('X link'),
        instagramUrl: socialUrl('Instagram link'),
        youtubeUrl: socialUrl('YouTube link'),
        tiktokUrl: socialUrl('TikTok link'),
      })
      .parse(data(form));

    assertChannel(staff, input.streamerId);
    const { streamerId, kickUsername, ...rest } = input;
    // The Kick handle is the source of truth for the channel link.
    const handle = kickUsername.replace(/^.*kick\.com\//i, '').replace(/\/+$/, '');
    await db
      .update(streamers)
      .set({
        ...rest,
        kickUsername: handle,
        kickUrl: `https://kick.com/${handle}`,
        role: rest.role || 'Creator',
        updatedAt: new Date(),
      })
      .where(eq(streamers.id, streamerId));
    return 'Profile saved.';
  });
}

/**
 * Add a channel to the crew.
 *
 * The slug becomes the profile URL, so it is fixed at creation. Everything
 * else starts blank and is filled in from the profile form — the point is
 * that a new creator can be onboarded without a deploy.
 */
export async function createStreamer(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        id: z
          .string()
          .trim()
          .min(2, 'A URL slug is required.')
          .max(40, 'That slug is too long.')
          .regex(/^[a-z0-9-]+$/, 'The slug can use lower-case letters, numbers and hyphens only.'),
        displayName: required(60, 'Display name'),
        kickUsername: required(60, 'Kick username'),
        role: optional(60, 'Role'),
        accent: oneOf(ACCENTS, 'accent colour'),
      })
      .parse(data(form));

    const [clash] = await db.select({ id: streamers.id }).from(streamers).where(eq(streamers.id, input.id)).limit(1);
    if (clash) throw new FormError('A channel with that URL slug already exists.');

    // Monogram from the display name: "DaddyKong Gaming" -> "DG".
    const initials = input.displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const [last] = await db.select({ sortOrder: streamers.sortOrder }).from(streamers).orderBy(desc(streamers.sortOrder)).limit(1);

    await db.insert(streamers).values({
      id: input.id,
      displayName: input.displayName,
      monogram: initials || input.displayName.slice(0, 2).toUpperCase(),
      role: input.role ?? 'Creator',
      accent: input.accent,
      kickUsername: input.kickUsername,
      kickUrl: `https://kick.com/${input.kickUsername}`,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });
    await logActivity('update', `${input.displayName} joined the FGDR crew`, 'Crew', `/streamers/${input.id}`);
    return `${input.displayName} added. Fill in their profile below.`;
  });
}

/** Hide a channel from the site. The row is kept so its content still resolves. */
export async function setStreamerActive(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(streamers).where(eq(streamers.id, id)).limit(1);
    if (!existing) throw new PermissionError('That channel no longer exists.');
    await db.update(streamers).set({ isActive: !existing.isActive, updatedAt: new Date() }).where(eq(streamers.id, id));
    return existing.isActive ? `${existing.displayName} hidden from the site.` : `${existing.displayName} is live on the site again.`;
  });
}

/* -------------------------------------------------------------------------- */
/*                                    clips                                   */
/* -------------------------------------------------------------------------- */

const PLATFORMS = ['kick', 'youtube', 'instagram', 'x', 'tiktok', 'upload'] as const;
const CLIP_CATEGORIES = ['big-win', 'highlight', 'funny', 'community'] as const;

export async function saveClip(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        streamerId: required(60, 'Channel'),
        title: required(140, 'Title'),
        platform: oneOf(PLATFORMS, 'platform'),
        category: oneOf(CLIP_CATEGORIES, 'category'),
        url: url('Clip link'),
        mediaUrl: url('Video file URL'),
        thumbnailUrl: url('Thumbnail'),
        orientation: oneOf(['landscape', 'portrait'] as const, 'orientation'),
        durationSec: optionalInt('Duration'),
        views: optionalInt('Views'),
        publishedAt: date('Date'),
      })
      .parse(data(form));

    if (!input.url && !input.mediaUrl) throw new FormError('Add a clip link or a video file URL.');
    assertChannel(staff, input.streamerId);
    const { id, ...rest } = input;
    const values = { ...rest, embedUrl: deriveEmbed(rest.platform, rest.url) };

    if (id) {
      const [existing] = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
      await assertExisting(staff, existing?.streamerId, Boolean(existing));
      await db.update(clips).set(values).where(eq(clips.id, id));
      return 'Clip updated.';
    }
    await db.insert(clips).values({ id: newId('clip'), status: 'approved', ...values });
    await logActivity('update', `New clip: ${values.title}`, 'Clips', '/clips');
    return 'Clip published.';
  });
}

export async function deleteClip(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
    await assertExisting(staff, existing?.streamerId, Boolean(existing));
    await db.delete(clips).where(eq(clips.id, id));
    return 'Clip deleted.';
  });
}

/* -------------------------------------------------------------------------- */
/*                                Wall of Fame                                */
/* -------------------------------------------------------------------------- */

const WIN_KINDS = ['max-win', 'big-win', 'legendary', 'community'] as const;

export async function saveWin(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        streamerId: required(60, 'Channel'),
        game: required(80, 'Game'),
        provider: text(60, 'Provider'),
        bet: money('Bet'),
        payout: money('Payout'),
        kind: oneOf(WIN_KINDS, 'win type'),
        description: text(400, 'Description'),
        thumbnailUrl: url('Thumbnail'),
        mediaUrl: url('Video file URL'),
        url: url('Clip link'),
        occurredAt: date('Date'),
      })
      .parse(data(form));

    assertChannel(staff, input.streamerId);
    const { id, ...values } = input;

    if (id) {
      const [existing] = await db.select().from(wins).where(eq(wins.id, id)).limit(1);
      await assertExisting(staff, existing?.streamerId, Boolean(existing));
      await db.update(wins).set(values).where(eq(wins.id, id));
      return 'Win updated.';
    }
    await db.insert(wins).values({ id: newId('win'), status: 'approved', ...values });
    await logActivity('fame', `New on the Wall of Fame: ${values.game}`, 'Wall of Fame', '/wall-of-fame');
    return 'Win added to the Wall of Fame.';
  });
}

export async function deleteWin(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(wins).where(eq(wins.id, id)).limit(1);
    await assertExisting(staff, existing?.streamerId, Boolean(existing));
    await db.delete(wins).where(eq(wins.id, id));
    return 'Win deleted.';
  });
}

/* -------------------------------------------------------------------------- */
/*                                   raffles                                  */
/* -------------------------------------------------------------------------- */

const RAFFLE_ART = ['rig', 'cash', 'console', 'travel', 'chips', 'watch'] as const;
const RAFFLE_STATUS = ['upcoming', 'active', 'ended'] as const;

export async function saveRaffle(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        hostId: optional(60, 'Host'),
        name: required(100, 'Name'),
        prize: required(160, 'Prize'),
        description: text(400, 'Description'),
        art: oneOf(RAFFLE_ART, 'artwork'),
        imageUrl: url('Prize image'),
        value: money('Prize value'),
        requirement: required(200, 'Entry requirement'),
        status: oneOf(RAFFLE_STATUS, 'status'),
        startsAt: date('Start'),
        endsAt: date('End'),
      })
      .parse(data(form));

    if (input.endsAt <= input.startsAt) throw new FormError('The end must be after the start.');
    assertHost(staff, input.hostId);
    const { id, ...values } = input;

    if (id) {
      const [existing] = await db.select().from(raffles).where(eq(raffles.id, id)).limit(1);
      if (!existing) throw new PermissionError('That raffle no longer exists.');
      if (!staff.isMaster) assertChannel(staff, existing.hostId);
      await db.update(raffles).set(values).where(eq(raffles.id, id));
      return 'Raffle updated.';
    }
    await db.insert(raffles).values({ id: newId('rf'), entries: 0, ...values });
    await logActivity('update', `New raffle: ${values.name}`, 'Raffles', '/raffles');
    return 'Raffle created.';
  });
}

export async function deleteRaffle(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(raffles).where(eq(raffles.id, id)).limit(1);
    if (!existing) throw new PermissionError('That raffle no longer exists.');
    if (!staff.isMaster) assertChannel(staff, existing.hostId);
    await db.delete(raffleEntries).where(eq(raffleEntries.raffleId, id));
    await db.delete(raffles).where(eq(raffles.id, id));
    return 'Raffle deleted.';
  });
}

/** Picks a random entrant with a verified Kick account and closes the raffle. */
export async function drawRaffleWinner(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [raffle] = await db.select().from(raffles).where(eq(raffles.id, id)).limit(1);
    if (!raffle) throw new PermissionError('That raffle no longer exists.');
    if (!staff.isMaster) assertChannel(staff, raffle.hostId);

    const entrants = await db
      .select({ kickUsername: users.kickUsername, kickVerified: users.kickVerified })
      .from(raffleEntries)
      .innerJoin(users, eq(users.id, raffleEntries.userId))
      .where(eq(raffleEntries.raffleId, id));
    const eligible = entrants.filter((e) => e.kickVerified && e.kickUsername);
    if (!eligible.length) throw new FormError('No eligible entries yet — entrants need a verified Kick account.');

    const { randomInt } = await import('node:crypto');
    const winner = eligible[randomInt(eligible.length)].kickUsername!;
    await db.update(raffles).set({ status: 'ended', winnerHandle: winner }).where(eq(raffles.id, id));
    await logActivity('winner', `${winner} won the ${raffle.name} raffle`, 'Raffle winner', '/raffles?status=ended');
    return `Winner drawn: @${winner}`;
  });
}

/* -------------------------------------------------------------------------- */
/*                                 challenges                                 */
/* -------------------------------------------------------------------------- */

export async function saveChallenge(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        hostId: optional(60, 'Host'),
        name: required(100, 'Name'),
        description: required(500, 'Description'),
        status: oneOf(['upcoming', 'active', 'completed'] as const, 'status'),
        goalLabel: required(40, 'Goal label'),
        goalType: oneOf(['currency', 'count'] as const, 'goal type'),
        goalTarget: money('Goal target'),
        goalCurrent: money('Current progress'),
        goalUnit: optional(20, 'Unit'),
        prize: required(160, 'Prize'),
        participants: int('Participants'),
        startsAt: date('Start'),
        endsAt: date('End'),
      })
      .parse(data(form));

    if (input.endsAt <= input.startsAt) throw new FormError('The end must be after the start.');
    assertHost(staff, input.hostId);
    const { id, ...values } = input;

    if (id) {
      const [existing] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
      if (!existing) throw new PermissionError('That challenge no longer exists.');
      if (!staff.isMaster) assertChannel(staff, existing.hostId);
      await db.update(challenges).set(values).where(eq(challenges.id, id));
      return 'Challenge updated.';
    }
    await db.insert(challenges).values({ id: newId('ch'), ...values });
    await logActivity('challenge', `New challenge announced: ${values.name}`, 'Challenge', '/challenges');
    return 'Challenge created.';
  });
}

export async function deleteChallenge(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
    if (!existing) throw new PermissionError('That challenge no longer exists.');
    if (!staff.isMaster) assertChannel(staff, existing.hostId);
    await db.delete(challenges).where(eq(challenges.id, id));
    return 'Challenge deleted.';
  });
}

/* -------------------------------------------------------------------------- */
/*                                  giveaways                                 */
/* -------------------------------------------------------------------------- */



/**
 * Log money handed back to the community.
 *
 * Creators log their own; a master admin can log a crew-wide payout with no
 * host at all. The public total is the sum of these rows, so an edit here is
 * immediately an edit to the headline number.
 */
export async function saveGiveaway(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        streamerId: optional(60, 'Channel'),
        winnerHandle: required(40, 'Winner'),
        amount: requiredMoney('Amount'),
        kind: oneOf(GIVEAWAY_KINDS, 'type'),
        note: optional(160, 'Note'),
        occurredAt: date('Date'),
      })
      .parse(data(form));

    assertHost(staff, input.streamerId);
    const { id, ...values } = input;

    if (id) {
      const [existing] = await db.select().from(giveaways).where(eq(giveaways.id, id)).limit(1);
      if (!existing) throw new PermissionError('That giveaway no longer exists.');
      if (!staff.isMaster) assertChannel(staff, existing.streamerId);
      await db.update(giveaways).set(values).where(eq(giveaways.id, id));
      return 'Giveaway updated.';
    }

    await db.insert(giveaways).values({ id: newId('gv'), ...values });
    await logActivity(
      'winner',
      `${values.winnerHandle} picked up ${usd(values.amount)} from the crew`,
      'Giveaway',
      '/giveaways',
    );
    return 'Giveaway logged.';
  });
}

export async function deleteGiveaway(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(giveaways).where(eq(giveaways.id, id)).limit(1);
    if (!existing) throw new PermissionError('That giveaway no longer exists.');
    if (!staff.isMaster) assertChannel(staff, existing.streamerId);
    await db.delete(giveaways).where(eq(giveaways.id, id));
    return 'Giveaway removed.';
  });
}

/** The starting figure for everything given away before the board existed. */
export async function saveGiveawaySettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({ giveawayBaseline: money('Starting total'), giveawayNote: text(160, 'Note') })
      .parse(data(form));
    await db
      .insert(siteSettings)
      .values({ id: 'default', ...input, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.id, set: { ...input, updatedAt: new Date() } });
    return 'Giveaway board settings saved.';
  });
}

/* -------------------------------------------------------------------------- */
/*                            master admins only                              */
/* -------------------------------------------------------------------------- */

export async function saveBoard(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        period: oneOf(LEADERBOARD_SITES, 'board'),
        label: required(40, 'Label'),
        subtitle: text(80, 'Subtitle'),
        startsAt: optionalDate('Start'),
        endsAt: optionalDate('End'),
        prizeLadder: text(400, 'Prizes'),
        totalWagered: money('Total wagered'),
        nextTarget: money('Next target'),
        nextReward: text(120, 'Next reward'),
      })
      .parse(data(form));
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      throw new FormError('The end must be after the start.');
    }
    const { period, ...rest } = input;
    const ladder = parsePrizeLadder(rest.prizeLadder);
    // Any time set by hand wins over the sync's calendar month; clearing both
    // hands the window back to the sync. The pool is always the ladder's sum.
    const values = {
      ...rest,
      prizeLadder: ladder.join(','),
      prizePool: ladderTotal(ladder),
      customWindow: Boolean(rest.startsAt || rest.endsAt),
    };
    await db.transaction(async (tx) => {
      await tx
        .insert(leaderboardBoards)
        .values({ period, ...values, updatedAt: new Date() })
        .onConflictDoUpdate({ target: leaderboardBoards.period, set: { ...values, updatedAt: new Date() } });
      // Re-price the current standings now rather than at the next sync.
      const rows = await tx.select({ id: leaderboardEntries.id, rank: leaderboardEntries.rank }).from(leaderboardEntries).where(eq(leaderboardEntries.period, period));
      for (const row of rows) {
        await tx.update(leaderboardEntries).set({ prize: ladder[row.rank - 1] ?? null }).where(eq(leaderboardEntries.id, row.id));
      }
    });
    return 'Leaderboard settings saved.';
  });
}

export async function saveLeaderboardEntry(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        id: z.string().optional(),
        period: oneOf(LEADERBOARD_SITES, 'board'),
        rank: int('Rank', 1),
        username: required(32, 'Username'),
        wagered: money('Wagered'),
        prize: optionalInt('Prize'),
        movement: optionalInt('Movement'),
      })
      .parse(data(form));
    const { id, ...values } = input;
    if (id) {
      await db.update(leaderboardEntries).set(values).where(eq(leaderboardEntries.id, id));
      return `Rank #${values.rank} saved.`;
    }
    await db.insert(leaderboardEntries).values({ id: newId(values.period), ...values });
    return `Rank #${values.rank} added.`;
  });
}

export async function deleteLeaderboardEntry(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.id, String(form.get('id') ?? '')));
    return 'Row removed.';
  });
}

export async function saveMilestone(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        id: z.string().optional(),
        name: required(40, 'Name'),
        threshold: requiredMoney('Monthly wager'),
        cashReward: money('Cash reward'),
        reward: required(120, 'Reward'),
        perk: text(120, 'Perk'),
        sortOrder: int('Order'),
      })
      .parse(data(form));
    const { id, ...values } = input;
    if (id) {
      await db.update(milestones).set(values).where(eq(milestones.id, id));
      return 'Milestone saved.';
    }
    await db.insert(milestones).values({ id: newId('ms'), ...values });
    return 'Milestone added.';
  });
}

export async function deleteMilestone(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db.delete(milestones).where(eq(milestones.id, String(form.get('id') ?? '')));
    return 'Milestone removed.';
  });
}

export async function saveAnnouncement(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        id: z.string().optional(),
        kicker: required(40, 'Label'),
        title: required(100, 'Title'),
        body: required(600, 'Message'),
        ctaLabel: optional(40, 'Button text'),
        ctaHref: url('Button link'),
        publishedAt: date('Date'),
      })
      .parse(data(form));
    const { id, ...values } = input;
    if (id) {
      await db.update(announcements).set(values).where(eq(announcements.id, id));
      return 'Announcement saved.';
    }
    await db.insert(announcements).values({ id: newId('an'), ...values });
    await logActivity('update', values.title, 'Community', '/community');
    return 'Announcement published.';
  });
}

export async function deleteAnnouncement(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db.delete(announcements).where(eq(announcements.id, String(form.get('id') ?? '')));
    return 'Announcement deleted.';
  });
}

export async function unlinkMemberKick(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db
      .update(users)
      .set({ kickUsername: null, kickUserId: null, kickVerified: false, kickLinkedAt: null, updatedAt: new Date() })
      .where(eq(users.id, String(form.get('id') ?? '')));
    return 'Kick account unlinked.';
  });
}

/* -------------------------------------------------------------------------- */
/*                          community stats & feed                            */
/* -------------------------------------------------------------------------- */

export async function saveCommunityStat(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        key: z
          .string()
          .trim()
          .min(2, 'Key is required.')
          .max(40, 'Key is too long.')
          .regex(/^[a-zA-Z0-9_]+$/, 'Key can use letters, numbers and underscores only.'),
        label: required(60, 'Label'),
        value: money('Value'),
        format: oneOf(['currency', 'number'] as const, 'format'),
        sortOrder: int('Order'),
      })
      .parse(data(form));

    const { key, ...values } = input;
    await db
      .insert(communityStats)
      .values({ key, ...values })
      .onConflictDoUpdate({ target: communityStats.key, set: values });
    return 'Statistic saved.';
  });
}

export async function deleteCommunityStat(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db.delete(communityStats).where(eq(communityStats.key, String(form.get('id') ?? '')));
    return 'Statistic removed.';
  });
}

export async function deleteActivityItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    await db.delete(activity).where(eq(activity.id, String(form.get('id') ?? '')));
    return 'Removed from the feed.';
  });
}

export async function saveActivityItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requireMaster();
    const input = z
      .object({
        type: oneOf(['winner', 'leaderboard', 'stream', 'challenge', 'update', 'fame'] as const, 'type'),
        title: required(160, 'Title'),
        tag: required(40, 'Label'),
        href: url('Link'),
      })
      .parse(data(form));
    await db.insert(activity).values({ id: newId('ac'), ...input, occurredAt: new Date() });
    return 'Posted to the community feed.';
  });
}

/* -------------------------------------------------------------------------- */
/*                                 bonus hunts                                */
/* -------------------------------------------------------------------------- */

/** Loads a hunt and checks the staff member owns the channel running it. */
async function huntFor(staff: Staff, id: string) {
  const [hunt] = await db.select().from(bonusHunts).where(eq(bonusHunts.id, id)).limit(1);
  if (!hunt) throw new PermissionError('That bonus hunt no longer exists.');
  assertChannel(staff, hunt.streamerId);
  return hunt;
}

/**
 * Set up and start a hunt: its title, channel and start balance. It starts
 * out collecting — which is what opens chat to `!sr` slot calls — and the
 * admin is taken straight to the hunt's own page to run it.
 *
 * From there it moves, one button at a time: collecting → guessing (chat
 * `!guess`es the final balance) → opening → complete, and the guess closest to
 * the final balance wins.
 */
export async function startBonusHunt(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = newId('bh');
  const result = await run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        streamerId: required(60, 'Channel'),
        title: required(120, 'Title'),
        startBalance: requiredMoney('Start balance'),
      })
      .parse(data(form));
    assertChannel(staff, input.streamerId);

    // Chat calls go to the channel's running hunt, so a channel gets one at a time.
    const [running] = await db
      .select({ title: bonusHunts.title })
      .from(bonusHunts)
      .where(and(eq(bonusHunts.streamerId, input.streamerId), sqlExpr`${bonusHunts.status} in ('collecting', 'guessing', 'opening')`))
      .limit(1);
    if (running) throw new FormError(`"${running.title}" is still running on this channel. Finish it before starting another.`);

    await db.insert(bonusHunts).values({ ...input, id, status: 'collecting', startedAt: new Date() });
    await logActivity('bonus-hunt', `Bonus hunt started: ${input.title}`, 'Bonus hunt', '/bonus-hunt');
    ensureChatWatcher().catch((error) => console.error('[admin] could not start the Kick chat watcher', error));
    return 'Bonus hunt started.';
  });
  // Outside `run`: a redirect is thrown, and `run` would report it as a failure.
  if (result?.ok) redirect(`/admin/bonus-hunts/${id}`);
  return result;
}

/** Collecting is done: stop taking slot calls and open guess the balance. */
export async function beginGuessing(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const hunt = await huntFor(staff, String(form.get('id') ?? ''));
    if (hunt.status !== 'collecting') throw new FormError('This hunt is already past collecting.');
    const [any] = await db.select({ id: bonusHuntBonuses.id }).from(bonusHuntBonuses).where(eq(bonusHuntBonuses.huntId, hunt.id)).limit(1);
    if (!any) throw new FormError('Add at least one bonus before opening guessing.');
    await db.update(bonusHunts).set({ status: 'guessing' }).where(eq(bonusHunts.id, hunt.id));
    return 'Guess the balance is open. Chat can !guess now.';
  });
}

/** Guessing is done: lock the guesses and start opening, from the first bonus. */
export async function beginOpeningHunt(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const hunt = await huntFor(staff, String(form.get('id') ?? ''));
    if (hunt.status !== 'guessing') throw new FormError('Open guess the balance first, then close it to start opening.');
    await db.update(bonusHunts).set({ status: 'opening' }).where(eq(bonusHunts.id, hunt.id));
    return 'Guessing closed. Start opening.';
  });
}

export async function saveBonusHunt(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        streamerId: required(60, 'Channel'),
        title: required(120, 'Title'),
        status: oneOf(['collecting', 'guessing', 'opening', 'complete'] as const, 'status'),
        startBalance: requiredMoney('Start balance'),
      })
      .parse(data(form));

    assertChannel(staff, input.streamerId);
    const { id, ...values } = input;

    // Collecting and guessing both take commands from chat, so chat has to be read.
    // Not awaited: resolving the chatrooms talks to Kick, and the form shouldn't wait on it.
    if (values.status === 'collecting' || values.status === 'guessing') {
      ensureChatWatcher().catch((error) => console.error('[admin] could not start the Kick chat watcher', error));
    }

    if (id) {
      await huntFor(staff, id);
      // Finishing a hunt stamps the time; reopening one clears it again.
      const endedAt = values.status === 'complete' ? new Date() : null;
      await db.update(bonusHunts).set({ ...values, endedAt }).where(eq(bonusHunts.id, id));
      return 'Bonus hunt updated.';
    }

    await db.insert(bonusHunts).values({ ...values, id: newId('bh'), startedAt: new Date() });
    await logActivity('bonus-hunt', `Bonus hunt started: ${values.title}`, 'Bonus hunt', '/bonus-hunt');
    return 'Bonus hunt created.';
  });
}

export async function deleteBonusHunt(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    await huntFor(staff, id);
    // Nothing cascades in this schema, so the bonuses, calls and guesses go first or they orphan.
    await db.delete(bonusHuntCalls).where(eq(bonusHuntCalls.huntId, id));
    await db.delete(bonusHuntGuesses).where(eq(bonusHuntGuesses.huntId, id));
    await db.delete(bonusHuntBonuses).where(eq(bonusHuntBonuses.huntId, id));
    await db.delete(bonusHunts).where(eq(bonusHunts.id, id));
    return 'Bonus hunt deleted.';
  });
}

/** Delete from the hunt's own page, which no longer exists afterwards — so leave it. */
export async function deleteBonusHuntAndLeave(prev: ActionState, form: FormData): Promise<ActionState> {
  const result = await deleteBonusHunt(prev, form);
  if (result?.ok) redirect('/admin/bonus-hunts');
  return result;
}

/** Add a bonus to the end of a hunt, or edit one already on the board. */
export async function saveHuntBonus(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: z.string().optional(),
        huntId: required(60, 'Hunt'),
        game: required(120, 'Game'),
        provider: optional(80, 'Provider'),
        bet: requiredMoney('Bet'),
        kind: oneOf(BONUS_KINDS, 'bonus type'),
      })
      .parse(data(form));

    await huntFor(staff, input.huntId);

    if (input.id) {
      const [existing] = await db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, input.id)).limit(1);
      if (!existing || existing.huntId !== input.huntId) {
        throw new PermissionError('That bonus is no longer on this hunt.');
      }
      await db
        .update(bonusHuntBonuses)
        .set({ game: input.game, provider: input.provider ?? '', bet: input.bet, kind: input.kind })
        .where(eq(bonusHuntBonuses.id, input.id));
      return 'Bonus updated.';
    }

    await appendBonus({ huntId: input.huntId, game: input.game, provider: input.provider ?? '', bet: input.bet, kind: input.kind });
    return `${input.game} added.`;
  });
}

/** Put a bonus at the end of a hunt's opening order. Returns its id. */
async function appendBonus(values: {
  huntId: string;
  game: string;
  provider: string;
  bet: number;
  kind: string;
  calledBy?: string;
}) {
  const [last] = await db
    .select({ position: bonusHuntBonuses.position })
    .from(bonusHuntBonuses)
    .where(eq(bonusHuntBonuses.huntId, values.huntId))
    .orderBy(desc(bonusHuntBonuses.position))
    .limit(1);

  const id = newId('bhb');
  await db.insert(bonusHuntBonuses).values({ ...values, id, position: (last?.position ?? 0) + 1 });
  return id;
}

/** Loads a chat call and checks the staff member owns the hunt it was made on. */
async function callFor(staff: Staff, id: string) {
  const [call] = await db.select().from(bonusHuntCalls).where(eq(bonusHuntCalls.id, id)).limit(1);
  if (!call) throw new PermissionError('That call no longer exists.');
  await huntFor(staff, call.huntId);
  return call;
}

/**
 * The streamer got a bonus on a viewer's call: say on what bet and which kind,
 * and it goes on the end of the hunt credited to the caller. The game name can
 * be corrected on the way, since chat spells slots however it likes.
 */
export async function confirmHuntCall(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z
      .object({
        id: required(60, 'Call'),
        game: required(120, 'Game'),
        provider: optional(80, 'Provider'),
        bet: requiredMoney('Bet'),
        kind: oneOf(BONUS_KINDS, 'bonus type'),
      })
      .parse(data(form));

    const call = await callFor(staff, input.id);
    if (call.status !== 'pending') throw new FormError('That call has already been dealt with.');

    const bonusId = await appendBonus({
      huntId: call.huntId,
      game: input.game,
      provider: input.provider ?? '',
      bet: input.bet,
      kind: input.kind,
      calledBy: call.kickUsername,
    });
    await db
      .update(bonusHuntCalls)
      .set({ status: 'got', bonusId, resolvedAt: new Date() })
      .where(eq(bonusHuntCalls.id, call.id));
    return `${input.game} added, called by @${call.kickUsername}.`;
  });
}

/** The streamer played the call and got no bonus on it. */
export async function missHuntCall(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const call = await callFor(staff, String(form.get('id') ?? ''));
    if (call.status !== 'pending') throw new FormError('That call has already been dealt with.');
    await db
      .update(bonusHuntCalls)
      .set({ status: 'missed', resolvedAt: new Date() })
      .where(eq(bonusHuntCalls.id, call.id));
    return `No bonus on @${call.kickUsername}'s ${call.game}.`;
  });
}

/** Put a call marked "no bonus" back in the queue, since the wrong button gets pressed live. */
export async function reopenHuntCall(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const call = await callFor(staff, String(form.get('id') ?? ''));
    if (call.status !== 'missed') throw new FormError('Only a call marked "no bonus" can go back in the queue.');
    await db
      .update(bonusHuntCalls)
      .set({ status: 'pending', resolvedAt: null })
      .where(eq(bonusHuntCalls.id, call.id));
    return `@${call.kickUsername}'s ${call.game} is back in the queue.`;
  });
}

/**
 * Swap an unopened bonus with the unopened one above or below it, which changes
 * the opening order. Opened bonuses are history and stay where they are.
 */
async function moveHuntBonus(form: FormData, direction: 'up' | 'down'): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [bonus] = await db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, id)).limit(1);
    if (!bonus) throw new PermissionError('That bonus no longer exists.');
    await huntFor(staff, bonus.huntId);
    if (bonus.payout !== null) throw new FormError('Opened bonuses stay where they are.');

    const [neighbour] = await db
      .select()
      .from(bonusHuntBonuses)
      .where(
        and(
          eq(bonusHuntBonuses.huntId, bonus.huntId),
          isNull(bonusHuntBonuses.payout),
          direction === 'up'
            ? sqlExpr`${bonusHuntBonuses.position} < ${bonus.position}`
            : sqlExpr`${bonusHuntBonuses.position} > ${bonus.position}`,
        ),
      )
      .orderBy(direction === 'up' ? desc(bonusHuntBonuses.position) : bonusHuntBonuses.position)
      .limit(1);
    if (!neighbour) throw new FormError(`${bonus.game} is already ${direction === 'up' ? 'first' : 'last'} to open.`);

    // Positions are unique per hunt, so one of the two parks at 0 while the other moves.
    await db.transaction(async (tx) => {
      await tx.update(bonusHuntBonuses).set({ position: 0 }).where(eq(bonusHuntBonuses.id, bonus.id));
      await tx.update(bonusHuntBonuses).set({ position: bonus.position }).where(eq(bonusHuntBonuses.id, neighbour.id));
      await tx.update(bonusHuntBonuses).set({ position: neighbour.position }).where(eq(bonusHuntBonuses.id, bonus.id));
    });
    return `${bonus.game} moved ${direction}.`;
  });
}

export async function moveHuntBonusUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  return moveHuntBonus(form, 'up');
}

export async function moveHuntBonusDown(_prev: ActionState, form: FormData): Promise<ActionState> {
  return moveHuntBonus(form, 'down');
}

export async function deleteHuntBonus(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [existing] = await db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, id)).limit(1);
    if (!existing) throw new PermissionError('That bonus no longer exists.');
    await huntFor(staff, existing.huntId);

    await db.delete(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, id));
    // A bonus confirmed from a chat call goes back to the queue rather than vanishing with it.
    await db
      .update(bonusHuntCalls)
      .set({ status: 'pending', bonusId: null, resolvedAt: null })
      .where(eq(bonusHuntCalls.bonusId, id));
    // Close the gap so the board keeps numbering 1..n with nothing missing.
    await db
      .update(bonusHuntBonuses)
      .set({ position: sqlExpr`${bonusHuntBonuses.position} - 1` })
      .where(
        and(
          eq(bonusHuntBonuses.huntId, existing.huntId),
          gt(bonusHuntBonuses.position, existing.position),
        ),
      );
    return 'Bonus removed.';
  });
}

/**
 * Record what a bonus paid.
 *
 * The one action used live, mid-stream, so it takes the payout and nothing
 * else. Zero is a real result and has to be accepted — a bonus paying nothing
 * is half the drama of a hunt — so this uses `money`, which allows zero, not
 * `requiredMoney`, which rejects it.
 */
export async function openHuntBonus(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const input = z.object({ id: required(60, 'Bonus'), payout: money('Payout') }).parse(data(form));

    const [bonus] = await db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, input.id)).limit(1);
    if (!bonus) throw new PermissionError('That bonus no longer exists.');
    const hunt = await huntFor(staff, bonus.huntId);

    await db
      .update(bonusHuntBonuses)
      .set({ payout: input.payout, openedAt: new Date() })
      .where(eq(bonusHuntBonuses.id, input.id));

    // Recording a payout means the opening has started, whatever step the hunt was left at.
    if (hunt.status === 'collecting' || hunt.status === 'guessing') {
      await db.update(bonusHunts).set({ status: 'opening' }).where(eq(bonusHunts.id, hunt.id));
    }

    const [stillClosed] = await db
      .select({ id: bonusHuntBonuses.id })
      .from(bonusHuntBonuses)
      .where(and(eq(bonusHuntBonuses.huntId, hunt.id), isNull(bonusHuntBonuses.payout)))
      .limit(1);

    if (!stillClosed) {
      await db.update(bonusHunts).set({ status: 'complete', endedAt: new Date() }).where(eq(bonusHunts.id, hunt.id));

      // The final balance now exists, so guess the balance has a winner.
      const [{ total }] = await db
        .select({ total: sqlExpr<number>`coalesce(sum(${bonusHuntBonuses.payout}), 0)` })
        .from(bonusHuntBonuses)
        .where(eq(bonusHuntBonuses.huntId, hunt.id));
      const guesses = await db.select().from(bonusHuntGuesses).where(eq(bonusHuntGuesses.huntId, hunt.id));
      const [winner] = rankGuesses(guesses, Math.round(Number(total) * 100) / 100);
      if (winner) {
        await logActivity(
          'winner',
          `@${winner.username} won guess the balance on ${hunt.title}`,
          'Guess the balance',
          '/bonus-hunt',
        );
        return `${bonus.game} paid ${usd(input.payout)}. Hunt finished at ${usd(Number(total))}. Guess the balance goes to @${winner.username} (guessed ${usd(winner.guess)}).`;
      }
      return `${bonus.game} paid ${usd(input.payout)}. That was the last one.`;
    }
    return `${bonus.game} paid ${usd(input.payout)}.`;
  });
}

/** Undo an opening — a payout fat-fingered mid-stream needs a way back. */
export async function reopenHuntBonus(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const staff = await requireStaff();
    const id = String(form.get('id') ?? '');
    const [bonus] = await db.select().from(bonusHuntBonuses).where(eq(bonusHuntBonuses.id, id)).limit(1);
    if (!bonus) throw new PermissionError('That bonus no longer exists.');
    const hunt = await huntFor(staff, bonus.huntId);

    await db.update(bonusHuntBonuses).set({ payout: null, openedAt: null }).where(eq(bonusHuntBonuses.id, id));
    if (hunt.status === 'complete') {
      await db.update(bonusHunts).set({ status: 'opening', endedAt: null }).where(eq(bonusHunts.id, hunt.id));
    }
    return `${bonus.game} reset — open it again.`;
  });
}
