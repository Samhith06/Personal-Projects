CREATE TABLE `giveaways` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text,
	`winner_handle` text NOT NULL,
	`amount` real NOT NULL,
	`kind` text DEFAULT 'tip' NOT NULL,
	`note` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `giveaways_time_idx` ON `giveaways` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`filename` text DEFAULT '' NOT NULL,
	`data` blob NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`threshold` real NOT NULL,
	`cash_reward` real DEFAULT 0 NOT NULL,
	`reward` text NOT NULL,
	`perk` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_milestones`("id", "name", "threshold", "cash_reward", "reward", "perk", "sort_order") SELECT "id", "name", "threshold", 0, "reward", "perk", "sort_order" FROM `milestones`;--> statement-breakpoint
DROP TABLE `milestones`;--> statement-breakpoint
ALTER TABLE `__new_milestones` RENAME TO `milestones`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_streamers` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`monogram` text NOT NULL,
	`role` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`chapter_title` text DEFAULT '' NOT NULL,
	`quote` text DEFAULT '' NOT NULL,
	`specialty` text DEFAULT '' NOT NULL,
	`biggest_win_game` text DEFAULT '' NOT NULL,
	`portrait_url` text,
	`accent` text DEFAULT 'gold' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`avatar_url` text,
	`banner_url` text,
	`kick_username` text NOT NULL,
	`kick_url` text NOT NULL,
	`x_url` text DEFAULT '#' NOT NULL,
	`instagram_url` text DEFAULT '#' NOT NULL,
	`youtube_url` text DEFAULT '#' NOT NULL,
	`tiktok_url` text DEFAULT '#' NOT NULL,
	`followers` integer DEFAULT 0 NOT NULL,
	`avg_viewers` integer DEFAULT 0 NOT NULL,
	`peak_viewers` integer DEFAULT 0 NOT NULL,
	`streams_this_month` integer DEFAULT 0 NOT NULL,
	`month_wager` integer DEFAULT 0 NOT NULL,
	`all_time_wager` integer DEFAULT 0 NOT NULL,
	`biggest_win` real DEFAULT 0 NOT NULL,
	`raffles_hosted` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_streamers`("id", "display_name", "monogram", "role", "tagline", "bio", "chapter_title", "quote", "specialty", "biggest_win_game", "portrait_url", "accent", "sort_order", "is_primary", "is_active", "avatar_url", "banner_url", "kick_username", "kick_url", "x_url", "instagram_url", "youtube_url", "tiktok_url", "followers", "avg_viewers", "peak_viewers", "streams_this_month", "month_wager", "all_time_wager", "biggest_win", "raffles_hosted", "updated_at") SELECT "id", "display_name", "monogram", "role", "tagline", "bio", "chapter_title", "quote", "specialty", "biggest_win_game", "portrait_url", "accent", "sort_order", "is_primary", "is_active", "avatar_url", "banner_url", "kick_username", "kick_url", "x_url", "instagram_url", "youtube_url", "tiktok_url", "followers", "avg_viewers", "peak_viewers", "streams_this_month", "month_wager", "all_time_wager", "biggest_win", "raffles_hosted", "updated_at" FROM `streamers`;--> statement-breakpoint
DROP TABLE `streamers`;--> statement-breakpoint
ALTER TABLE `__new_streamers` RENAME TO `streamers`;--> statement-breakpoint
CREATE TABLE `__new_wins` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`game` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`bet` real NOT NULL,
	`payout` real NOT NULL,
	`kind` text DEFAULT 'big-win' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`thumbnail_url` text,
	`media_url` text,
	`embed_url` text,
	`url` text,
	`clip_id` text,
	`occurred_at` integer NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`featured_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_wins`("id", "streamer_id", "game", "provider", "bet", "payout", "kind", "description", "thumbnail_url", "media_url", "embed_url", "url", "clip_id", "occurred_at", "status", "is_featured", "featured_order") SELECT "id", "streamer_id", "game", "provider", "bet", "payout", "kind", "description", "thumbnail_url", "media_url", "embed_url", "url", "clip_id", "occurred_at", "status", "is_featured", "featured_order" FROM `wins`;--> statement-breakpoint
DROP TABLE `wins`;--> statement-breakpoint
ALTER TABLE `__new_wins` RENAME TO `wins`;--> statement-breakpoint
CREATE INDEX `wins_status_idx` ON `wins` (`status`,`payout`);--> statement-breakpoint
ALTER TABLE `site_settings` ADD `giveaway_baseline` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `giveaway_note` text DEFAULT '' NOT NULL;