CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`tag` text NOT NULL,
	`href` text,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_time_idx` ON `activity` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`kicker` text DEFAULT 'Announcement' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`cta_label` text,
	`cta_href` text,
	`published_at` integer NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenge_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenge_entry_unique` ON `challenge_entries` (`challenge_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`host_id` text,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`goal_label` text DEFAULT 'Community goal' NOT NULL,
	`goal_type` text DEFAULT 'currency' NOT NULL,
	`goal_target` integer NOT NULL,
	`goal_current` integer DEFAULT 0 NOT NULL,
	`goal_unit` text,
	`prize` text NOT NULL,
	`participants` integer DEFAULT 0 NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clips` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`streamer_id` text NOT NULL,
	`platform` text NOT NULL,
	`category` text DEFAULT 'highlight' NOT NULL,
	`url` text,
	`media_url` text,
	`embed_url` text,
	`thumbnail_url` text,
	`orientation` text DEFAULT 'landscape' NOT NULL,
	`duration_sec` integer,
	`views` integer,
	`published_at` integer NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`featured_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clips_status_idx` ON `clips` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `clips_streamer_idx` ON `clips` (`streamer_id`);--> statement-breakpoint
CREATE TABLE `community_stats` (
	`key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`value` integer NOT NULL,
	`format` text DEFAULT 'number' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kick_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`expected_username` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`matched_kick_user_id` text,
	`matched_channel` text,
	`failure_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer
);
--> statement-breakpoint
CREATE INDEX `kick_verif_code_idx` ON `kick_verifications` (`code`,`status`);--> statement-breakpoint
CREATE INDEX `kick_verif_user_idx` ON `kick_verifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `leaderboard_boards` (
	`period` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`prize_pool` integer DEFAULT 0 NOT NULL,
	`total_wagered` integer DEFAULT 0 NOT NULL,
	`next_target` integer DEFAULT 0 NOT NULL,
	`next_reward` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leaderboard_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`rank` integer NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text,
	`wagered` integer NOT NULL,
	`prize` integer,
	`movement` integer,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `lb_period_rank_idx` ON `leaderboard_entries` (`period`,`rank`);--> statement-breakpoint
CREATE TABLE `member_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`total_wagered` integer DEFAULT 0 NOT NULL,
	`month_wagered` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`threshold` integer NOT NULL,
	`reward` text NOT NULL,
	`perk` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `past_streams` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'Slots & Casino' NOT NULL,
	`aired_at` integer NOT NULL,
	`duration_min` integer DEFAULT 0 NOT NULL,
	`peak_viewers` integer DEFAULT 0 NOT NULL,
	`url` text
);
--> statement-breakpoint
CREATE INDEX `past_streams_streamer_idx` ON `past_streams` (`streamer_id`,`aired_at`);--> statement-breakpoint
CREATE TABLE `raffle_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`raffle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raffle_entry_unique` ON `raffle_entries` (`raffle_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `raffles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prize` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`host_id` text,
	`art` text DEFAULT 'chips' NOT NULL,
	`image_url` text,
	`value` integer DEFAULT 0 NOT NULL,
	`requirement` text NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`entries` integer DEFAULT 0 NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`winner_handle` text,
	`is_featured` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`title` text NOT NULL,
	`platform` text DEFAULT 'kick' NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_min` integer DEFAULT 180 NOT NULL,
	`is_special` integer DEFAULT false NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `schedule_streamer_idx` ON `schedule_slots` (`streamer_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`hero_title` text DEFAULT 'Fat Guys Don''t Run' NOT NULL,
	`hero_tagline` text DEFAULT 'Four creators. One crew. One community.' NOT NULL,
	`hero_video_url` text DEFAULT '' NOT NULL,
	`hero_poster_url` text DEFAULT '' NOT NULL,
	`featured_streamer_id` text,
	`featured_challenge_id` text,
	`featured_raffle_id` text,
	`featured_announcement_id` text,
	`featured_clip_ids` text DEFAULT '[]' NOT NULL,
	`featured_win_ids` text DEFAULT '[]' NOT NULL,
	`discord_url` text DEFAULT '#' NOT NULL,
	`x_url` text DEFAULT '#' NOT NULL,
	`instagram_url` text DEFAULT '#' NOT NULL,
	`youtube_url` text DEFAULT '#' NOT NULL,
	`stake_url` text DEFAULT '#' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `streamers` (
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
	`biggest_win` integer DEFAULT 0 NOT NULL,
	`raffles_hosted` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`discord_username` text NOT NULL,
	`discord_global_name` text,
	`discord_avatar` text,
	`role` text DEFAULT 'member' NOT NULL,
	`streamer_id` text,
	`kick_username` text,
	`kick_user_id` text,
	`kick_verified` integer DEFAULT false NOT NULL,
	`kick_linked_at` integer,
	`stake_username` text,
	`age_confirmed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_idx` ON `users` (`discord_id`);--> statement-breakpoint
CREATE TABLE `wins` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`game` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`bet` integer NOT NULL,
	`payout` integer NOT NULL,
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
CREATE INDEX `wins_status_idx` ON `wins` (`status`,`payout`);