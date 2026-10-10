/**
 * FGDR database schema (libSQL / SQLite via Drizzle).
 *
 * Every piece of content the site renders lives here so it can be managed from
 * the admin area — nothing is hardcoded in components. `src/server/db/seed.ts`
 * loads a realistic starting set; the admin panel edits the same rows.
 */
import { sql } from 'drizzle-orm';
import { blob, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = sql`(unixepoch())`;

/* -------------------------------------------------------------------------- */
/*                                   People                                   */
/* -------------------------------------------------------------------------- */

/** A member of the FGDR community. Identity always comes from Discord. */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Discord snowflake — the only identity we authenticate against. */
    discordId: text('discord_id').notNull(),
    discordUsername: text('discord_username').notNull(),
    discordGlobalName: text('discord_global_name'),
    /** Avatar hash only; the CDN URL is derived at render time. */
    discordAvatar: text('discord_avatar'),

    /** 'member' | 'creator' | 'admin' */
    role: text('role').notNull().default('member'),
    /** Set for creator accounts: the streamer profile they own. */
    streamerId: text('streamer_id'),

    /** Linked Kick account (verified via Kick OAuth when configured). */
    kickUsername: text('kick_username'),
    kickUserId: text('kick_user_id'),
    kickVerified: integer('kick_verified', { mode: 'boolean' }).notNull().default(false),
    kickLinkedAt: integer('kick_linked_at', { mode: 'timestamp' }),

    /** Self-declared Stake.com username. Private by default — never rendered publicly. */
    stakeUsername: text('stake_username'),
    /** Self-declared Stake.eu username — a separate account on a separate site. Private too. */
    stakeEuUsername: text('stake_eu_username'),

    /** Last time the member confirmed they are 18+ (asked again after each login). */
    ageConfirmedAt: integer('age_confirmed_at', { mode: 'timestamp' }),

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [uniqueIndex('users_discord_id_idx').on(t.discordId)],
);

export type User = typeof users.$inferSelect;

/**
 * One-time chat codes: an alternative to Kick OAuth. The member posts the code
 * in any FGDR creator's Kick chat; the sender identity on that chat message
 * (set by Kick, not the member) is what gets linked.
 */
export const kickVerifications = sqliteTable(
  'kick_verifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    code: text('code').notNull(),
    /** Lower-cased Kick username the member says is theirs; only that sender can redeem. */
    expectedUsername: text('expected_username').notNull(),
    /** pending | verified | expired | cancelled */
    status: text('status').notNull().default('pending'),
    matchedKickUserId: text('matched_kick_user_id'),
    matchedChannel: text('matched_channel'),
    failureReason: text('failure_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  },
  (t) => [index('kick_verif_code_idx').on(t.code, t.status), index('kick_verif_user_idx').on(t.userId, t.createdAt)],
);

export type KickVerification = typeof kickVerifications.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                  Streamers                                 */
/* -------------------------------------------------------------------------- */

export const streamers = sqliteTable('streamers', {
  /** URL slug, e.g. 'fatguysdontrun'. */
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  monogram: text('monogram').notNull(),
  role: text('role').notNull(),
  tagline: text('tagline').notNull().default(''),
  bio: text('bio').notNull().default(''),
  /** Crew "chapter" presentation on the homepage. */
  chapterTitle: text('chapter_title').notNull().default(''),
  quote: text('quote').notNull().default(''),
  specialty: text('specialty').notNull().default(''),
  biggestWinGame: text('biggest_win_game').notNull().default(''),
  /** Tall editorial portrait (≈4:5). Falls back to generated art when empty. */
  portraitUrl: text('portrait_url'),
  /** Visual accent: gold | cyan | steel | ruby */
  accent: text('accent').notNull().default('gold'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),

  kickUsername: text('kick_username').notNull(),
  kickUrl: text('kick_url').notNull(),
  /** Placeholder '#' until the real handles are supplied. */
  xUrl: text('x_url').notNull().default('#'),
  instagramUrl: text('instagram_url').notNull().default('#'),
  youtubeUrl: text('youtube_url').notNull().default('#'),
  tiktokUrl: text('tiktok_url').notNull().default('#'),

  followers: integer('followers').notNull().default(0),
  avgViewers: integer('avg_viewers').notNull().default(0),
  peakViewers: integer('peak_viewers').notNull().default(0),
  streamsThisMonth: integer('streams_this_month').notNull().default(0),
  monthWager: integer('month_wager').notNull().default(0),
  allTimeWager: integer('all_time_wager').notNull().default(0),
  biggestWin: real('biggest_win').notNull().default(0),
  rafflesHosted: integer('raffles_hosted').notNull().default(0),

  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export type Streamer = typeof streamers.$inferSelect;

/** Past broadcasts shown on a creator profile. */
export const pastStreams = sqliteTable(
  'past_streams',
  {
    id: text('id').primaryKey(),
    streamerId: text('streamer_id').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull().default('Slots & Casino'),
    airedAt: integer('aired_at', { mode: 'timestamp' }).notNull(),
    durationMin: integer('duration_min').notNull().default(0),
    peakViewers: integer('peak_viewers').notNull().default(0),
    url: text('url'),
  },
  (t) => [index('past_streams_streamer_idx').on(t.streamerId, t.airedAt)],
);

export type PastStream = typeof pastStreams.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                 Short-form                                 */
/* -------------------------------------------------------------------------- */

/**
 * A clip. `platform` decides how the mini-player renders it:
 *   upload  → <video src=mediaUrl> played inline with FGDR controls
 *   youtube → privacy-enhanced iframe embed
 *   instagram/tiktok/kick/x → embed when permitted, otherwise a branded
 *   "open on <platform>" hand-off. Nothing ever silently breaks.
 */
export const clips = sqliteTable(
  'clips',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    streamerId: text('streamer_id').notNull(),
    /** kick | youtube | instagram | x | tiktok | upload */
    platform: text('platform').notNull(),
    /** big-win | highlight | funny | community */
    category: text('category').notNull().default('highlight'),
    /** Canonical link on the source platform. */
    url: text('url'),
    /** Direct-playable file (uploads / transcoded renditions). */
    mediaUrl: text('media_url'),
    /** iframe embed URL when the platform allows embedding. */
    embedUrl: text('embed_url'),
    thumbnailUrl: text('thumbnail_url'),
    /** landscape | portrait */
    orientation: text('orientation').notNull().default('landscape'),
    durationSec: integer('duration_sec'),
    views: integer('views'),
    publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
    /** pending | approved | rejected — only 'approved' is ever public. */
    status: text('status').notNull().default('approved'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    featuredOrder: integer('featured_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [
    index('clips_status_idx').on(t.status, t.publishedAt),
    index('clips_streamer_idx').on(t.streamerId),
  ],
);

export type Clip = typeof clips.$inferSelect;

/** Wall of Fame — the trophy room. */
export const wins = sqliteTable(
  'wins',
  {
    id: text('id').primaryKey(),
    streamerId: text('streamer_id').notNull(),
    game: text('game').notNull(),
    provider: text('provider').notNull().default(''),
    /** Stake amount and payout in USD — fractional stakes (0.20) are normal. */
    bet: real('bet').notNull(),
    payout: real('payout').notNull(),
    /** max-win | big-win | legendary | community */
    kind: text('kind').notNull().default('big-win'),
    description: text('description').notNull().default(''),
    thumbnailUrl: text('thumbnail_url'),
    mediaUrl: text('media_url'),
    embedUrl: text('embed_url'),
    url: text('url'),
    clipId: text('clip_id'),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull().default('approved'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    featuredOrder: integer('featured_order').notNull().default(0),
  },
  (t) => [index('wins_status_idx').on(t.status, t.payout)],
);

export type Win = typeof wins.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                 Bonus hunts                                */
/* -------------------------------------------------------------------------- */

/**
 * A bonus hunt: bonuses collected at a fixed stake, then opened one by one
 * while chat watches the running average climb or collapse.
 *
 * Only what was observed is stored — the start balance, and each bonus with
 * its bet and payout. Everything the board shows (break-even, running average,
 * what the rest still have to pay) is derived from those on read, so a stat can
 * never drift out of step with the bonuses it was calculated from.
 */
export const bonusHunts = sqliteTable(
  'bonus_hunts',
  {
    id: text('id').primaryKey(),
    streamerId: text('streamer_id').notNull(),
    title: text('title').notNull(),
    /** collecting | guessing | opening | complete */
    status: text('status').notNull().default('collecting'),
    /** What the hunt was funded with, in USD. The number the openings have to beat. */
    startBalance: real('start_balance').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(now),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    /**
     * Where the numbers come from. 'manual' is the admin panel; anything else
     * names an external tracker, with `externalId` its id for the hunt there.
     * A synced hunt is still editable — a tracker being down never blocks a
     * stream.
     */
    source: text('source').notNull().default('manual'),
    externalId: text('external_id'),
    syncedAt: integer('synced_at', { mode: 'timestamp' }),
  },
  (t) => [index('bonus_hunts_status_idx').on(t.status, t.startedAt), index('bonus_hunts_streamer_idx').on(t.streamerId)],
);

export type BonusHunt = typeof bonusHunts.$inferSelect;

/** One bonus in a hunt. `payout` stays null until it has been opened. */
export const bonusHuntBonuses = sqliteTable(
  'bonus_hunt_bonuses',
  {
    id: text('id').primaryKey(),
    huntId: text('hunt_id').notNull(),
    /** Opening order, 1-based. */
    position: integer('position').notNull(),
    game: text('game').notNull(),
    provider: text('provider').notNull().default(''),
    /** Stake in USD — fractional stakes (0.20) are normal. */
    bet: real('bet').notNull(),
    /** null = not opened yet. 0 is a real result: the bonus paid nothing. */
    payout: real('payout'),
    openedAt: integer('opened_at', { mode: 'timestamp' }),
    /** normal | super | hidden — which bonus round the spins landed. */
    kind: text('kind').notNull().default('normal'),
    /** Kick username of the viewer who called this slot, when it came from chat. */
    calledBy: text('called_by'),
  },
  (t) => [uniqueIndex('bonus_hunt_position_unique').on(t.huntId, t.position)],
);

export type BonusHuntBonus = typeof bonusHuntBonuses.$inferSelect;

/**
 * A slot a viewer called from Kick chat (`!sr <game>`) while a hunt was collecting.
 *
 * The caller's identity is the chat message's sender, as delivered by Kick.
 * A call only turns into a bonus when the streamer confirms they got one and
 * says on what bet and which kind; until then it waits in the admin queue.
 */
export const bonusHuntCalls = sqliteTable(
  'bonus_hunt_calls',
  {
    id: text('id').primaryKey(),
    huntId: text('hunt_id').notNull(),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    /** The game as the viewer typed it. */
    game: text('game').notNull(),
    /** pending | got | missed */
    status: text('status').notNull().default('pending'),
    /** The bonus it became, once the streamer confirmed it. */
    bonusId: text('bonus_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  },
  (t) => [
    // One call per viewer per hunt — calling again only corrects a pending call.
    uniqueIndex('bonus_hunt_call_caller_unique').on(t.huntId, t.kickUserId),
    index('bonus_hunt_calls_status_idx').on(t.huntId, t.status),
  ],
);

export type BonusHuntCall = typeof bonusHuntCalls.$inferSelect;

/**
 * A viewer's guess at a hunt's final balance (`!guess 1234`), taken while the
 * hunt is in its guess-the-balance step. Guessing again before it closes
 * replaces the guess. The winner is not stored: it is whoever is closest once
 * the hunt finishes, worked out from the guesses and the payouts on read.
 */
export const bonusHuntGuesses = sqliteTable(
  'bonus_hunt_guesses',
  {
    id: text('id').primaryKey(),
    huntId: text('hunt_id').notNull(),
    kickUserId: text('kick_user_id').notNull(),
    kickUsername: text('kick_username').notNull(),
    /** The final balance guessed, in USD. */
    guess: real('guess').notNull(),
    /** When the guess (or its latest change) was made — the earlier of two equal guesses wins. */
    guessedAt: integer('guessed_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [uniqueIndex('bonus_hunt_guess_unique').on(t.huntId, t.kickUserId)],
);

export type BonusHuntGuess = typeof bonusHuntGuesses.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                 Competition                                */
/* -------------------------------------------------------------------------- */

/**
 * One wager leaderboard per Stake site (stake-com | stake-eu). The column is
 * still called `period` from when the boards were today/week/month/alltime.
 */
export const leaderboardBoards = sqliteTable('leaderboard_boards', {
  period: text('period').primaryKey(),
  label: text('label').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  /** An admin set the start/end by hand, so the sheet sync must leave them alone. */
  customWindow: integer('custom_window', { mode: 'boolean' }).notNull().default(false),
  prizePool: integer('prize_pool').notNull().default(0),
  /** Prize by finishing position, comma-separated dollars (`600,250,170`). Each site pays its own. */
  prizeLadder: text('prize_ladder').notNull().default(''),
  totalWagered: integer('total_wagered').notNull().default(0),
  nextTarget: integer('next_target').notNull().default(0),
  nextReward: text('next_reward').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export type LeaderboardBoard = typeof leaderboardBoards.$inferSelect;

export const leaderboardEntries = sqliteTable(
  'leaderboard_entries',
  {
    id: text('id').primaryKey(),
    period: text('period').notNull(),
    rank: integer('rank').notNull(),
    /** Masked display handle, e.g. 'vi***ro'. Never a full Stake username. */
    username: text('username').notNull(),
    avatarUrl: text('avatar_url'),
    wagered: integer('wagered').notNull(),
    prize: integer('prize'),
    /** Positive = climbed, negative = dropped, null = new entry. */
    movement: integer('movement'),
    /** Set when the row belongs to a signed-in member (for "my position"). */
    userId: text('user_id'),
  },
  (t) => [index('lb_period_rank_idx').on(t.period, t.rank)],
);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;

export const raffles = sqliteTable('raffles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  prize: text('prize').notNull(),
  description: text('description').notNull().default(''),
  /** Channel that runs this raffle (null = crew-wide). */
  hostId: text('host_id'),
  /** Line art key used when no prize photo has been uploaded. */
  art: text('art').notNull().default('chips'),
  imageUrl: text('image_url'),
  value: integer('value').notNull().default(0),
  requirement: text('requirement').notNull(),
  /** active | upcoming | ended */
  status: text('status').notNull().default('upcoming'),
  entries: integer('entries').notNull().default(0),
  startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp' }).notNull(),
  winnerHandle: text('winner_handle'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
});

export type Raffle = typeof raffles.$inferSelect;

export const raffleEntries = sqliteTable(
  'raffle_entries',
  {
    id: text('id').primaryKey(),
    raffleId: text('raffle_id').notNull(),
    userId: text('user_id').notNull(),
    tickets: integer('tickets').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [uniqueIndex('raffle_entry_unique').on(t.raffleId, t.userId)],
);

export type RaffleEntry = typeof raffleEntries.$inferSelect;

export const challenges = sqliteTable('challenges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  hostId: text('host_id'),
  /** active | upcoming | completed */
  status: text('status').notNull().default('upcoming'),
  goalLabel: text('goal_label').notNull().default('Community goal'),
  /** currency | count */
  goalType: text('goal_type').notNull().default('currency'),
  goalTarget: integer('goal_target').notNull(),
  goalCurrent: integer('goal_current').notNull().default(0),
  goalUnit: text('goal_unit'),
  prize: text('prize').notNull(),
  participants: integer('participants').notNull().default(0),
  startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp' }).notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
});

export type Challenge = typeof challenges.$inferSelect;

export const challengeEntries = sqliteTable(
  'challenge_entries',
  {
    id: text('id').primaryKey(),
    challengeId: text('challenge_id').notNull(),
    userId: text('user_id').notNull(),
    progress: integer('progress').notNull().default(0),
    joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [uniqueIndex('challenge_entry_unique').on(t.challengeId, t.userId)],
);

export type ChallengeEntry = typeof challengeEntries.$inferSelect;

/**
 * A VIP reward tier. `threshold` is the **monthly** wager that unlocks it and
 * `cashReward` is what it pays; `reward` / `perk` carry any extra wording.
 */
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  threshold: real('threshold').notNull(),
  /** Cash paid out at this tier, in USD. */
  cashReward: real('cash_reward').notNull().default(0),
  reward: text('reward').notNull(),
  perk: text('perk').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type Milestone = typeof milestones.$inferSelect;

/** A member's verified wager total, the basis for milestones + "my position". */
export const memberProgress = sqliteTable('member_progress', {
  userId: text('user_id').primaryKey(),
  totalWagered: integer('total_wagered').notNull().default(0),
  monthWagered: integer('month_wagered').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export type MemberProgress = typeof memberProgress.$inferSelect;

/**
 * What one Stake user wagered on one day (German time) under the crew's code.
 *
 * The affiliate sheet only ever reports a running total for its current export
 * window, so the sync turns each total into per-day increments here. Summing
 * rows is what gives lifetime / month / week figures the sheet never has.
 * Full Stake usernames are private — only master admins see this table.
 */
export const stakeWagerDays = sqliteTable(
  'stake_wager_days',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    /** The sheet's `start_date_utc`, verbatim — which running total this day counts against. */
    windowStart: text('window_start').notNull(),
    /** `YYYY-MM-DD` in Europe/Berlin. */
    day: text('day').notNull(),
    wagered: real('wagered').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [
    uniqueIndex('stake_wager_days_unique').on(t.username, t.windowStart, t.day),
    index('stake_wager_days_day_idx').on(t.day),
  ],
);

export type StakeWagerDay = typeof stakeWagerDays.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                  Giveaways                                 */
/* -------------------------------------------------------------------------- */

/**
 * Money the crew has handed back to the community — a tip, a bonus buy, a
 * raffle payout. The running total on the giveaway board is the sum of these
 * rows plus `siteSettings.giveawayBaseline`, so everything on that page traces
 * back to a real entry an admin added.
 */
export const giveaways = sqliteTable(
  'giveaways',
  {
    id: text('id').primaryKey(),
    /** Who paid it out. Null = the crew as a whole. */
    streamerId: text('streamer_id'),
    /** The winner as they want to be credited, e.g. 'sunny'. */
    winnerHandle: text('winner_handle').notNull(),
    /** USD. Fractional amounts are normal — plenty of these are cents. */
    amount: real('amount').notNull(),
    /** tip | bonus-buy | raffle | challenge | other */
    kind: text('kind').notNull().default('tip'),
    note: text('note'),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (t) => [index('giveaways_time_idx').on(t.occurredAt)],
);

export type Giveaway = typeof giveaways.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                               Uploaded media                               */
/* -------------------------------------------------------------------------- */

/**
 * Images uploaded from the admin panel.
 *
 * They live in the database rather than on disk on purpose: the app runs on a
 * host with an ephemeral filesystem, so a file written next to the server is
 * gone on the next deploy. Stored here, an avatar survives exactly as long as
 * the row that points at it. Served by `/api/media/[id]`.
 */
export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  mimeType: text('mime_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  /** Original filename, kept only so the admin list is readable. */
  filename: text('filename').notNull().default(''),
  data: blob('data').notNull(),
  uploadedBy: text('uploaded_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                                  Community                                 */
/* -------------------------------------------------------------------------- */

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  kicker: text('kicker').notNull().default('Announcement'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  ctaLabel: text('cta_label'),
  ctaHref: text('cta_href'),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
});

export type Announcement = typeof announcements.$inferSelect;

export const activity = sqliteTable(
  'activity',
  {
    id: text('id').primaryKey(),
    /** winner | leaderboard | stream | challenge | update | fame */
    type: text('type').notNull(),
    title: text('title').notNull(),
    tag: text('tag').notNull(),
    href: text('href'),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('activity_time_idx').on(t.occurredAt)],
);

export type Activity = typeof activity.$inferSelect;

export const communityStats = sqliteTable('community_stats', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  value: integer('value').notNull(),
  /** currency | number */
  format: text('format').notNull().default('number'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type CommunityStat = typeof communityStats.$inferSelect;

/* -------------------------------------------------------------------------- */
/*                            Curation / site config                          */
/* -------------------------------------------------------------------------- */

/**
 * Singleton row (id = 'default'). This is what keeps the homepage curated:
 * admins choose exactly what the front door shows.
 */
export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey().default('default'),

  heroTitle: text('hero_title').notNull().default('FatGuysDontRun'),
  heroTagline: text('hero_tagline').notNull().default('Four creators. One crew. One community.'),
  heroVideoUrl: text('hero_video_url').notNull().default(''),
  heroPosterUrl: text('hero_poster_url').notNull().default(''),

  featuredStreamerId: text('featured_streamer_id'),
  featuredChallengeId: text('featured_challenge_id'),
  featuredRaffleId: text('featured_raffle_id'),
  featuredAnnouncementId: text('featured_announcement_id'),
  /** JSON arrays of ids, in display order. */
  featuredClipIds: text('featured_clip_ids').notNull().default('[]'),
  featuredWinIds: text('featured_win_ids').notNull().default('[]'),

  /** Everything given away before this site started tracking it, in USD. */
  giveawayBaseline: real('giveaway_baseline').notNull().default(0),
  giveawayNote: text('giveaway_note').notNull().default(''),

  discordUrl: text('discord_url').notNull().default('#'),
  xUrl: text('x_url').notNull().default('#'),
  instagramUrl: text('instagram_url').notNull().default('#'),
  youtubeUrl: text('youtube_url').notNull().default('#'),
  stakeUrl: text('stake_url').notNull().default('#'),

  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
