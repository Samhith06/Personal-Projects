/**
 * SteezySpins database schema (Postgres via Drizzle).
 *
 * Mirrors the data model in ARCHITECTURE.md §4. Money is stored as numeric and
 * read as a JS number (USD, two decimals is plenty for wagers and prizes).
 * Bonus hunts and slot tournaments are run on the site (MattySpins rules); see the section below.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: 'number' });

/* -------------------------------------------------------------------------- */
/*                                   People                                   */
/* -------------------------------------------------------------------------- */

/** A community member. Identity comes from Discord or Telegram (either or both). */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    discordId: text('discord_id'),
    discordUsername: text('discord_username'),
    discordGlobalName: text('discord_global_name'),
    /** Avatar hash only; the CDN URL is derived at render time. */
    discordAvatar: text('discord_avatar'),

    /** Telegram login (widget). The id and HMAC come from Telegram, never typed by the member. */
    telegramId: text('telegram_id'),
    telegramUsername: text('telegram_username'),
    telegramName: text('telegram_name'),
    telegramPhotoUrl: text('telegram_photo_url'),
    telegramLinkedAt: ts('telegram_linked_at'),

    /** 'member' | 'mod' | 'admin' | 'owner' — assigned from env on every login, never self-set. */
    role: text('role').notNull().default('member'),

    /** Linked Kick account. The id comes from Kick (OAuth or chat sender), never typed by the member. */
    kickUserId: text('kick_user_id'),
    kickUsername: text('kick_username'),
    /** 'oauth' | 'chat' */
    kickLinkMethod: text('kick_link_method'),
    kickLinkedAt: ts('kick_linked_at'),

    /** Last time the member confirmed 18+ (asked again after each login). */
    ageConfirmedAt: ts('age_confirmed_at'),
    tosVersion: text('tos_version'),
    tosAcceptedAt: ts('tos_accepted_at'),

    /** Privacy: wager amounts on the public profile (default hidden, rank only). */
    wagerPublic: boolean('wager_public').notNull().default(false),
    /** Privacy: show the name on leaderboards instead of a masked one. */
    nameOnLeaderboards: boolean('name_on_leaderboards').notNull().default(true),

    /** Set by staff after an abuse review: no giveaways, raffles or milestone claims. */
    blockedFromRewards: boolean('blocked_from_rewards').notNull().default(false),
    staffNotes: text('staff_notes'),
    /** Who sent them to play under the code. Free text typed by staff. */
    referredBy: text('referred_by'),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastSeenAt: ts('last_seen_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_discord_id_idx').on(t.discordId),
    uniqueIndex('users_kick_user_id_idx').on(t.kickUserId),
    uniqueIndex('users_telegram_id_idx').on(t.telegramId),
  ],
);

export type User = typeof users.$inferSelect;

/** One-time `!verify CODE` chat codes, the alternative to Kick OAuth. */
export const kickVerifications = pgTable(
  'kick_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    /** pending | verified | expired | cancelled */
    status: text('status').notNull().default('pending'),
    matchedKickUserId: text('matched_kick_user_id'),
    failureReason: text('failure_reason'),
    createdAt: createdAt(),
    expiresAt: ts('expires_at').notNull(),
    verifiedAt: ts('verified_at'),
  },
  (t) => [index('kick_verif_code_idx').on(t.code, t.status), index('kick_verif_user_idx').on(t.userId, t.createdAt)],
);

/**
 * A member's Roobet username claim. One row per member; a rejected claim is
 * resubmitted by updating the same row. Approval stores Roobet's own `uid`, so a
 * later rename on Roobet doesn't break the link, and locks it.
 */
export const roobetLinks = pgTable(
  'roobet_links',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedUsername: text('requested_username').notNull(),
    /** Roobet user id, set on approval. */
    roobetUid: text('roobet_uid'),
    /** pending | approved | rejected */
    status: text('status').notNull().default('pending'),
    rejectReason: text('reject_reason'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: ts('reviewed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('roobet_links_uid_idx').on(t.roobetUid), index('roobet_links_status_idx').on(t.status)],
);

/* -------------------------------------------------------------------------- */
/*                          Streams and watch time                            */
/* -------------------------------------------------------------------------- */

/** One live broadcast, from Kick's `livestream.status.updated` live → offline. */
export const streamSessions = pgTable(
  'stream_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kickLivestreamId: text('kick_livestream_id'),
    title: text('title'),
    startedAt: ts('started_at').notNull(),
    endedAt: ts('ended_at'),
  },
  (t) => [
    index('stream_sessions_started_idx').on(t.startedAt),
    // At most one open session at a time.
    // (NULLs are distinct in a plain unique index, so index the expression instead.)
    uniqueIndex('stream_sessions_one_open_idx')
      .on(sql`(${t.endedAt} is null)`)
      .where(sql`${t.endedAt} is null`),
  ],
);

/** Raw chat timestamps during a session, kept so watch time can be recomputed. Prunable after rollup. */
export const chatActivity = pgTable(
  'chat_activity',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => streamSessions.id, { onDelete: 'cascade' }),
    /** Kick's message id — webhook retries are dropped on this. */
    kickMessageId: text('kick_message_id').notNull(),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    at: ts('at').notNull(),
    /** sha256 of the normalised text, for repeat detection. The message itself is never stored. */
    contentHash: text('content_hash').notNull(),
    /** Whether the anti-farm rules let this message earn credit. */
    counted: boolean('counted').notNull().default(true),
  },
  (t) => [
    uniqueIndex('chat_activity_message_idx').on(t.kickMessageId),
    index('chat_activity_session_user_idx').on(t.sessionId, t.kickUserId, t.at),
  ],
);

/** Rolled-up watch time per member per session. */
export const watchTime = pgTable(
  'watch_time',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => streamSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    minutes: integer('minutes').notNull().default(0),
    messages: integer('messages').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] }), index('watch_time_user_idx').on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*                                   Roobet                                   */
/* -------------------------------------------------------------------------- */

/**
 * Daily wager snapshot per Roobet player under code STZY. The affiliate API only
 * returns totals for a date range, so the sync asks for one UTC day at a time.
 */
export const roobetDailyWager = pgTable(
  'roobet_daily_wager',
  {
    roobetUid: text('roobet_uid').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    username: text('username').notNull(),
    wagered: money('wagered').notNull().default(0),
    weightedWagered: money('weighted_wagered').notNull().default(0),
    /** `{ multiplier, wagered, payout, gameId, gameTitle }` from the API. */
    highestMultiplier: jsonb('highest_multiplier'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.roobetUid, t.day] }), index('roobet_daily_day_idx').on(t.day)],
);

/* -------------------------------------------------------------------------- */
/*                                   Badges                                   */
/* -------------------------------------------------------------------------- */

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  /** Rule evaluated by the badge job, e.g. `{ "minStreams30d": 8 }`. Null = manual only. */
  rule: jsonb('rule'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    /** 'auto' | 'manual' — manual grants survive the badge job. */
    source: text('source').notNull().default('auto'),
    grantedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

/* -------------------------------------------------------------------------- */
/*                         Leaderboards and milestones                        */
/* -------------------------------------------------------------------------- */

export const leaderboards = pgTable('leaderboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  /** 'wagered' | 'weighted' (default: Roobet's weighted wager, so low-edge games count less) */
  metric: text('metric').notNull().default('weighted'),
  minWager: money('min_wager').notNull().default(0),
  /** Prize per place, index 0 = 1st. */
  prizes: jsonb('prizes').$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  maskNames: boolean('mask_names').notNull().default(false),
  /** draft | live | frozen | published */
  status: text('status').notNull().default('draft'),
  createdAt: createdAt(),
});

/** Final standings, written when a board is frozen. */
export const leaderboardResults = pgTable(
  'leaderboard_results',
  {
    leaderboardId: uuid('leaderboard_id')
      .notNull()
      .references(() => leaderboards.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull(),
    roobetUid: text('roobet_uid').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: text('display_name').notNull(),
    wagered: money('wagered').notNull(),
    prize: money('prize').notNull().default(0),
    paidAt: ts('paid_at'),
    /** Prize forfeited by staff (kept for the record, out of the payout queue). */
    deniedAt: ts('denied_at'),
  },
  (t) => [primaryKey({ columns: [t.leaderboardId, t.rank] })],
);

/**
 * Double points (wager boosts): while one runs, every wager under the code
 * counts `multiplier` times on the leaderboard. `endsAt` null = runs until an
 * admin turns it off; `stoppedAt` is when they did. Only one runs at a time.
 */
export const wagerBoosts = pgTable(
  'wager_boosts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    multiplier: numeric('multiplier', { precision: 4, scale: 2, mode: 'number' }).notNull().default(2),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at'),
    stoppedAt: ts('stopped_at'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    lastSyncedAt: ts('last_synced_at'),
    /** Set when a weekly schedule created this window; `occurrenceKey` (`<scheduleId>:<local date>`) stops it being made twice. */
    scheduleId: uuid('schedule_id').references(() => wagerBoostSchedules.id, { onDelete: 'set null' }),
    occurrenceKey: text('occurrence_key'),
    /** When the "it's on" / "it's over" posts went to the Discord #leaderboard channel. */
    announcedStartAt: ts('announced_start_at'),
    announcedEndAt: ts('announced_end_at'),
    createdAt: createdAt(),
  },
  (t) => [index('wager_boosts_starts_idx').on(t.startsAt), uniqueIndex('wager_boosts_occurrence_idx').on(t.occurrenceKey)],
);

/** A repeating double-points window, e.g. every Friday 20:00–22:00 in the admin's time zone. */
export const wagerBoostSchedules = pgTable('wager_boost_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  multiplier: numeric('multiplier', { precision: 4, scale: 2, mode: 'number' }).notNull().default(2),
  /** 0 = Sunday … 6 = Saturday, in `timeZone`. */
  weekday: integer('weekday').notNull(),
  /** Minutes after local midnight. */
  startMinute: integer('start_minute').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  /** IANA zone the admin picked the time in, so DST shifts keep it at the same local time. */
  timeZone: text('time_zone').notNull(),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

/** Each player's wager inside a boost's exact window, pulled from Roobet for just that window. */
export const wagerBoostTotals = pgTable(
  'wager_boost_totals',
  {
    boostId: uuid('boost_id')
      .notNull()
      .references(() => wagerBoosts.id, { onDelete: 'cascade' }),
    roobetUid: text('roobet_uid').notNull(),
    username: text('username').notNull(),
    wagered: money('wagered').notNull().default(0),
    weightedWagered: money('weighted_wagered').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.boostId, t.roobetUid] })],
);

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  threshold: money('threshold').notNull(),
  reward: money('reward').notNull(),
  /** 'lifetime' for now; per-period milestones can come later. */
  metric: text('metric').notNull().default('lifetime'),
  active: boolean('active').notNull().default(true),
});

export const milestoneClaims = pgTable(
  'milestone_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => milestones.id, { onDelete: 'cascade' }),
    /** claimed | paid | rejected (denied from Payouts) */
    status: text('status').notNull().default('claimed'),
    claimedAt: createdAt(),
    paidAt: ts('paid_at'),
    paidBy: uuid('paid_by').references(() => users.id),
  },
  (t) => [uniqueIndex('milestone_claims_once_idx').on(t.userId, t.milestoneId)],
);

/* -------------------------------------------------------------------------- */
/*                          Raffles and giveaways                             */
/* -------------------------------------------------------------------------- */

/** Provably fair draws: `seedHash` = sha256(seed) is published before close, `seed` after the draw. */
export const raffles = pgTable('raffles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  metric: text('metric').notNull().default('wagered'),
  usdPerTicket: money('usd_per_ticket').notNull().default(1000),
  maxTicketsPerUser: integer('max_tickets_per_user').notNull().default(100),
  prizes: jsonb('prizes').$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  seedHash: text('seed_hash'),
  seed: text('seed'),
  /** Secret path segment for the OBS browser source. */
  overlayToken: text('overlay_token').notNull(),
  /** draft | open | closed | drawn */
  status: text('status').notNull().default('draft'),
  drawnAt: ts('drawn_at'),
  createdAt: createdAt(),
});

/** Ticket counts, snapshotted when the raffle closes (live counts are computed from wagers). */
export const raffleTickets = pgTable(
  'raffle_tickets',
  {
    raffleId: uuid('raffle_id')
      .notNull()
      .references(() => raffles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tickets: integer('tickets').notNull(),
    /** Wager in the raffle window that earned the tickets. */
    wagered: money('wagered').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.raffleId, t.userId] })],
);

export const raffleWinners = pgTable(
  'raffle_winners',
  {
    raffleId: uuid('raffle_id')
      .notNull()
      .references(() => raffles.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    prize: money('prize').notNull(),
    paidAt: ts('paid_at'),
    /** Prize forfeited by staff (kept for the record, out of the payout queue). */
    deniedAt: ts('denied_at'),
  },
  (t) => [primaryKey({ columns: [t.raffleId, t.position] })],
);

export const giveaways = pgTable('giveaways', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  prize: text('prize').notNull(),
  /** e.g. `{ "kickLinked": true, "roobetApproved": false, "minDiscordAgeDays": 7, "minWatchMinutes": 0 }` */
  eligibility: jsonb('eligibility').notNull().default(sql`'{}'::jsonb`),
  /** Chat keyword that enters, e.g. `!join`. Null = site button only. */
  entryKeyword: text('entry_keyword'),
  winnersCount: integer('winners_count').notNull().default(1),
  opensAt: ts('opens_at'),
  closesAt: ts('closes_at'),
  /** Minutes entries stay open once the giveaway opens; sets closesAt on open. Null = closed by hand. */
  timerMinutes: integer('timer_minutes'),
  seedHash: text('seed_hash'),
  seed: text('seed'),
  /** Secret path segment for the OBS browser source. */
  overlayToken: text('overlay_token').notNull(),
  /** draft | open | closed | drawn */
  status: text('status').notNull().default('draft'),
  drawnAt: ts('drawn_at'),
  createdAt: createdAt(),
});

export const giveawayEntries = pgTable(
  'giveaway_entries',
  {
    giveawayId: uuid('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'site' | 'chat' */
    source: text('source').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.giveawayId, t.userId] })],
);

export const giveawayWinners = pgTable(
  'giveaway_winners',
  {
    giveawayId: uuid('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    drawnAt: createdAt(),
    paidAt: ts('paid_at'),
    /** Prize forfeited by staff (kept for the record, out of the payout queue). */
    deniedAt: ts('denied_at'),
  },
  (t) => [primaryKey({ columns: [t.giveawayId, t.position] })],
);

/* -------------------------------------------------------------------------- */
/*                     Bonus hunts and slot tournaments                       */
/* -------------------------------------------------------------------------- */

/*
 * Ported from MattySpins (migrations 015, 018 and 022) and read with raw SQL
 * in src/server/services/{slots,hunts,tourney}.ts. The one change: prizes are
 * free text ("$100 tip") that staff pay by hand and mark paid, where MattySpins
 * paid site coins automatically.
 */

const cash = (name: string) => numeric(name, { precision: 12, scale: 2, mode: 'number' });
const id = () => bigserial('id', { mode: 'number' }).primaryKey();

/**
 * The slot catalog: what the hunt picks from and what `!sr` matches against.
 * Filled from bonushunt.gg's public "new slots" feed and by hand. The feed only
 * shows what is new, so rows accumulate and are never removed by a sync.
 * `key` (name and provider, letters and digits only) de-duplicates a re-sync.
 */
export const slots = pgTable(
  'slots',
  {
    id: id(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    provider: text('provider').notNull().default(''),
    imageUrl: text('image_url'),
    playUrl: text('play_url'),
    casinos: text('casinos').array().notNull().default(sql`'{}'::text[]`),
    bonusBuy: boolean('bonus_buy'),
    /** 'bonushunt' | 'manual' */
    source: text('source').notNull().default('bonushunt'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('slots_name_idx').on(sql`lower(${t.name})`),
    index('slots_provider_idx').on(t.provider),
    index('slots_added_idx').on(t.addedAt.desc()),
  ],
);

/**
 * A hunt: collecting → opening → finished. Only one is ever unfinished (the
 * partial unique index), so chat commands never have to say which. Guess the
 * balance runs alongside: closed → open → locked → settled.
 */
export const bonusHunts = pgTable(
  'bonus_hunts',
  {
    id: id(),
    title: text('title').notNull(),
    startCost: cash('start_cost').notNull(),
    status: text('status').notNull().default('collecting'),
    requestsOpen: boolean('requests_open').notNull().default(true),
    gtbStatus: text('gtb_status').notNull().default('closed'),
    /** What the closest guess wins, e.g. "$100 tip". Fixed when guessing opens. */
    gtbPrize: text('gtb_prize'),
    gtbPrizePaidAt: ts('gtb_prize_paid_at'),
    /** Written once, at settlement, so a corrected payout can't move the result. */
    finalBalance: cash('final_balance'),
    gtbWinnerKickId: text('gtb_winner_kick_id'),
    gtbWinnerName: text('gtb_winner_name'),
    gtbWinnerUserId: uuid('gtb_winner_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    openingAt: ts('opening_at'),
    finishedAt: ts('finished_at'),
    settledAt: ts('settled_at'),
  },
  (t) => [
    uniqueIndex('bonus_hunts_one_live_idx').on(sql`(${t.status} <> 'finished')`).where(sql`${t.status} <> 'finished'`),
    check('bonus_hunts_start_cost_check', sql`${t.startCost} >= 0`),
  ],
);

/** A bonus in a hunt. `payout` is null until opened. The slot is copied so editing the catalog can't rewrite history. */
export const huntBonuses = pgTable(
  'hunt_bonuses',
  {
    id: id(),
    huntId: bigint('hunt_id', { mode: 'number' })
      .notNull()
      .references(() => bonusHunts.id, { onDelete: 'cascade' }),
    slotId: bigint('slot_id', { mode: 'number' }).references(() => slots.id, { onDelete: 'set null' }),
    slotName: text('slot_name').notNull(),
    provider: text('provider').notNull().default(''),
    imageUrl: text('image_url'),
    bet: cash('bet').notNull(),
    payout: cash('payout'),
    position: integer('position').notNull(),
    requestedBy: text('requested_by'),
    createdAt: createdAt(),
    openedAt: ts('opened_at'),
  },
  (t) => [
    index('hunt_bonuses_hunt_idx').on(t.huntId, t.position),
    check('hunt_bonuses_bet_check', sql`${t.bet} > 0`),
    check('hunt_bonuses_payout_check', sql`${t.payout} >= 0`),
  ],
);

/** `!sr <slot>` from Kick chat. Any number per viewer; the same slot twice while pending is ignored. */
export const slotRequests = pgTable(
  'slot_requests',
  {
    id: id(),
    huntId: bigint('hunt_id', { mode: 'number' })
      .notNull()
      .references(() => bonusHunts.id, { onDelete: 'cascade' }),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    query: text('query').notNull(),
    slotId: bigint('slot_id', { mode: 'number' }).references(() => slots.id, { onDelete: 'set null' }),
    /** 'pending' | 'added' | 'dismissed' */
    status: text('status').notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [
    index('slot_requests_hunt_idx').on(t.huntId, t.status, t.createdAt),
    index('slot_requests_viewer_idx').on(t.huntId, t.kickUserId, t.status),
  ],
);

/** `!gtb <amount>`: one guess per chatter per hunt, replaceable while guessing is open. */
export const gtbGuesses = pgTable(
  'gtb_guesses',
  {
    huntId: bigint('hunt_id', { mode: 'number' })
      .notNull()
      .references(() => bonusHunts.id, { onDelete: 'cascade' }),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    guess: cash('guess').notNull(),
    guessedAt: timestamp('guessed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.huntId, t.kickUserId] }), check('gtb_guesses_guess_check', sql`${t.guess} >= 0`)],
);

/**
 * A slot tournament. Chat signs up with `!sr <slot>`; seeding draws a 4, 8 or
 * 16 bracket at random (shrunk, with byes, if fewer signed up); each match is
 * one bonus buy a side and the higher multiplier goes through. Only one is
 * ever live, so `!sr` never has to say which.
 */
export const tourneyGames = pgTable(
  'tourney_games',
  {
    id: id(),
    title: text('title').notNull(),
    size: integer('size').notNull(),
    /** What the champion wins, e.g. "$250". */
    prize: text('prize'),
    prizePaidAt: ts('prize_paid_at'),
    /** 'signup' | 'running' | 'finished' */
    status: text('status').notNull().default('signup'),
    requestsOpen: boolean('requests_open').notNull().default(true),
    createdAt: createdAt(),
    startedAt: ts('started_at'),
    finishedAt: ts('finished_at'),
  },
  (t) => [
    uniqueIndex('tourney_games_one_live_idx').on(sql`(${t.status} <> 'finished')`).where(sql`${t.status} <> 'finished'`),
    check('tourney_games_size_check', sql`${t.size} IN (2, 4, 8, 16)`),
  ],
);

/** Sign-ups: one per chatter per tournament, with the slot they'll play. `seeded` = made the bracket. */
export const tourneyEntries = pgTable(
  'tourney_entries',
  {
    id: id(),
    gameId: bigint('game_id', { mode: 'number' })
      .notNull()
      .references(() => tourneyGames.id, { onDelete: 'cascade' }),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    query: text('query').notNull(),
    slotId: bigint('slot_id', { mode: 'number' }).references(() => slots.id, { onDelete: 'set null' }),
    seeded: boolean('seeded').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('tourney_entries_game_kick_idx').on(t.gameId, t.kickUserId)],
);

/** Every match of every round, made at seeding. A bye is a round 1 match with no second player. */
export const tourneyMatches = pgTable(
  'tourney_matches',
  {
    id: id(),
    gameId: bigint('game_id', { mode: 'number' })
      .notNull()
      .references(() => tourneyGames.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    position: integer('position').notNull(),
    aEntryId: bigint('a_entry_id', { mode: 'number' }).references(() => tourneyEntries.id, { onDelete: 'set null' }),
    bEntryId: bigint('b_entry_id', { mode: 'number' }).references(() => tourneyEntries.id, { onDelete: 'set null' }),
    bye: boolean('bye').notNull().default(false),
    winnerEntryId: bigint('winner_entry_id', { mode: 'number' }).references(() => tourneyEntries.id, { onDelete: 'set null' }),
    /** 'played' | 'bye' | 'forfeit', once there is a winner. */
    decidedBy: text('decided_by'),
    decidedAt: ts('decided_at'),
  },
  (t) => [uniqueIndex('tourney_matches_pos_idx').on(t.gameId, t.round, t.position)],
);

/** Every buy, kept as history. Scores are read from these, never stored. */
export const tourneyTurns = pgTable(
  'tourney_turns',
  {
    id: id(),
    gameId: bigint('game_id', { mode: 'number' })
      .notNull()
      .references(() => tourneyGames.id, { onDelete: 'cascade' }),
    matchId: bigint('match_id', { mode: 'number' })
      .notNull()
      .references(() => tourneyMatches.id, { onDelete: 'cascade' }),
    entryId: bigint('entry_id', { mode: 'number' }).references(() => tourneyEntries.id, { onDelete: 'set null' }),
    /** 'a' | 'b' */
    side: text('side').notNull(),
    kickUsername: text('kick_username').notNull(),
    slotId: bigint('slot_id', { mode: 'number' }).references(() => slots.id, { onDelete: 'set null' }),
    slotName: text('slot_name').notNull(),
    provider: text('provider').notNull().default(''),
    imageUrl: text('image_url'),
    /** 'playing' | 'played' | 'skipped' */
    status: text('status').notNull().default('playing'),
    buyCost: cash('buy_cost'),
    payout: cash('payout'),
    drawnAt: timestamp('drawn_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: ts('resolved_at'),
  },
  (t) => [
    index('tourney_turns_match_idx').on(t.matchId, t.drawnAt),
    uniqueIndex('tourney_turns_one_playing_idx').on(t.gameId).where(sql`${t.status} = 'playing'`),
    check('tourney_turns_side_check', sql`${t.side} IN ('a', 'b')`),
    check('tourney_turns_cost_check', sql`${t.buyCost} > 0`),
    check('tourney_turns_payout_check', sql`${t.payout} >= 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/*                         Abuse, audit and settings                          */
/* -------------------------------------------------------------------------- */

/** Hashed (HMAC with AUTH_SECRET) IP / device seen per member. Raw values are never stored. */
export const userFingerprints = pgTable(
  'user_fingerprints',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'ip' | 'device' */
    kind: text('kind').notNull(),
    hash: text('hash').notNull(),
    hits: integer('hits').notNull().default(1),
    firstSeen: createdAt(),
    lastSeen: ts('last_seen').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.hash] }), index('user_fingerprints_hash_idx').on(t.kind, t.hash)],
);

export const abuseFlags = pgTable(
  'abuse_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    relatedUserId: uuid('related_user_id').references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    /** open | dismissed | actioned */
    status: text('status').notNull().default('open'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: ts('reviewed_at'),
    createdAt: createdAt(),
  },
  (t) => [index('abuse_flags_status_idx').on(t.status)],
);

/** Every staff action. `actorId` null = the system (sync jobs, chat bot). */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_target_idx').on(t.targetType, t.targetId), index('audit_log_created_idx').on(t.createdAt)],
);

/** Small admin-editable config: geo list, ToS version, cooldowns, watch-time constants. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
});

/** Bookkeeping for background jobs (last Roobet sync, last error). */
export const syncState = pgTable('sync_state', {
  key: text('key').primaryKey(),
  lastRunAt: ts('last_run_at'),
  lastOkAt: ts('last_ok_at'),
  lastError: text('last_error'),
  detail: jsonb('detail'),
});
