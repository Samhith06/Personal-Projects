/**
 * SteezySpins database schema (Postgres via Drizzle).
 *
 * Mirrors the data model in ARCHITECTURE.md §4. Money is stored as numeric and
 * read as a JS number (USD, two decimals is plenty for wagers and prizes).
 * Bonus hunts are mirrored from bonushunt.gg; guesses and slot tournaments are our own.
 */
import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
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

/** A community member. Identity always comes from Discord. */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    discordId: text('discord_id').notNull(),
    discordUsername: text('discord_username').notNull(),
    discordGlobalName: text('discord_global_name'),
    /** Avatar hash only; the CDN URL is derived at render time. */
    discordAvatar: text('discord_avatar'),

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
  },
  (t) => [primaryKey({ columns: [t.leaderboardId, t.rank] })],
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
    /** claimed | paid | rejected */
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
  },
  (t) => [primaryKey({ columns: [t.giveawayId, t.position] })],
);

/* -------------------------------------------------------------------------- */
/*                     Bonus hunts and slot tournaments                       */
/* -------------------------------------------------------------------------- */

/**
 * A bonus hunt, mirrored from bonushunt.gg (`GET /api/public/hunts`). The API
 * fields are copied as they come; our own columns (guessing, prize, winner)
 * are never overwritten by a sync.
 */
export const hunts = pgTable(
  'hunts',
  {
    /** bonushunt.gg hunt id. */
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    casino: text('casino'),
    startCost: money('start_cost').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    isOpening: boolean('is_opening').notNull().default(false),
    /** bonushunt.gg bonus id being opened right now. */
    currentOpeningSlot: text('current_opening_slot'),
    completed: boolean('completed').notNull().default(false),
    /** `{ bonusCount, openedBonuses, totalWinnings, profitLoss, averagePayoutRequired, … }` */
    stats: jsonb('stats').notNull().default(sql`'{}'::jsonb`),
    /** `[{ id, slotName, provider, slotImage, betSize, payout, multiplier, order }]` */
    bonuses: jsonb('bonuses').notNull().default(sql`'[]'::jsonb`),
    remoteCreatedAt: ts('remote_created_at').notNull(),
    remoteUpdatedAt: ts('remote_updated_at').notNull(),
    syncedAt: ts('synced_at').notNull().defaultNow(),

    /** Staff can close guessing early; it also closes on its own when the opening starts. */
    guessesOpen: boolean('guesses_open').notNull().default(true),
    guessPrize: text('guess_prize'),
    /** Closest guess, set when the hunt completes. */
    winnerUserId: uuid('winner_user_id').references(() => users.id, { onDelete: 'set null' }),
    winnerGuess: money('winner_guess'),
    settledAt: ts('settled_at'),
    prizePaidAt: ts('prize_paid_at'),
    /** Hidden from the site (test hunts). */
    hidden: boolean('hidden').notNull().default(false),
    /** `!sr` slot suggestions are taken while the hunt is being collected and this is on. */
    requestsOpen: boolean('requests_open').notNull().default(true),
  },
  (t) => [index('hunts_created_idx').on(t.remoteCreatedAt)],
);

/** Slots chat suggested for a hunt with `!sr`. Staff add them on bonushunt.gg, then mark them here. */
export const huntRequests = pgTable(
  'hunt_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    huntId: text('hunt_id')
      .notNull()
      .references(() => hunts.id, { onDelete: 'cascade' }),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    slot: text('slot').notNull(),
    /** Lowercased letters and digits only, so "Sweet Bonanza" and "sweet-bonanza" are one request. */
    slotKey: text('slot_key').notNull(),
    /** pending | added | dismissed */
    status: text('status').notNull().default('pending'),
    /** Set when staff add it: the base bet it was bought at, and the kind of bonus. */
    bet: money('bet'),
    /** normal | super | hidden */
    bonusType: text('bonus_type'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('hunt_requests_once_idx').on(t.huntId, t.kickUserId, t.slotKey), index('hunt_requests_hunt_idx').on(t.huntId, t.status)],
);

/** One guess per member per hunt; guessing again replaces it until guessing closes. */
export const huntGuesses = pgTable(
  'hunt_guesses',
  {
    huntId: text('hunt_id')
      .notNull()
      .references(() => hunts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: money('amount').notNull(),
    /** 'site' | 'chat' */
    source: text('source').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.huntId, t.userId] })],
);

/**
 * Slot tournament (not in the bonushunt.gg API, so run from the admin panel).
 * Single elimination; each match is two players' slots, highest multiplier wins.
 */
export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  prize: text('prize'),
  /** Most players the bracket holds: 4, 8 or 16. */
  size: integer('size').notNull().default(8),
  /** signup | live | finished */
  status: text('status').notNull().default('signup'),
  /** `!sr` sign-ups (and, once live, slot changes) are taken while this is on. */
  requestsOpen: boolean('requests_open').notNull().default(true),
  createdAt: createdAt(),
  startedAt: ts('started_at'),
  finishedAt: ts('finished_at'),
});

/** Who signed up in chat with `!sr <slot>`, and the slot they'll play. One entry per Kick account. */
export const tournamentEntries = pgTable(
  'tournament_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    /** Null for players staff added by hand. */
    kickUserId: text('kick_user_id'),
    kickUsername: text('kick_username').notNull(),
    slot: text('slot').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('tournament_entries_kick_idx').on(t.tournamentId, t.kickUserId)],
);

export const tournamentMatches = pgTable(
  'tournament_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    /** 1 = first round; the final is the last round. */
    round: integer('round').notNull(),
    /** Position within the round, 0-based; winners of 2k and 2k+1 meet next round. */
    slot: integer('slot').notNull(),
    playerA: text('player_a'),
    slotA: text('slot_a'),
    multiA: numeric('multi_a', { precision: 12, scale: 2, mode: 'number' }),
    playerB: text('player_b'),
    slotB: text('slot_b'),
    multiB: numeric('multi_b', { precision: 12, scale: 2, mode: 'number' }),
    /** 'a' | 'b' once decided. A level result leaves it null and both buy again. */
    winner: text('winner'),
    /** Every bonus bought in this match (ties included), and what they cost and paid, for profit. */
    buys: integer('buys').notNull().default(0),
    cost: money('cost').notNull().default(0),
    payout: money('payout').notNull().default(0),
  },
  (t) => [uniqueIndex('tournament_matches_pos_idx').on(t.tournamentId, t.round, t.slot)],
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
