-- The generator also wanted to rebuild site_settings here, to change the
-- hero_title DEFAULT after the brand rename. That default only applies to
-- newly inserted rows and this table only ever holds one, written explicitly
-- by the seed -- so the rebuild was a DROP TABLE on live homepage settings in
-- exchange for nothing. Removed deliberately; the snapshot still records the
-- new default, so it will not come back.

CREATE TABLE `bonus_hunt_bonuses` (
	`id` text PRIMARY KEY NOT NULL,
	`hunt_id` text NOT NULL,
	`position` integer NOT NULL,
	`game` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`bet` real NOT NULL,
	`payout` real,
	`opened_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bonus_hunt_position_unique` ON `bonus_hunt_bonuses` (`hunt_id`,`position`);--> statement-breakpoint
CREATE TABLE `bonus_hunts` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`start_balance` real NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ended_at` integer,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `bonus_hunts_status_idx` ON `bonus_hunts` (`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `bonus_hunts_streamer_idx` ON `bonus_hunts` (`streamer_id`);
