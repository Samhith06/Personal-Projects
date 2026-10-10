CREATE TABLE `bonus_hunt_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`hunt_id` text NOT NULL,
	`kick_user_id` text NOT NULL,
	`kick_username` text NOT NULL,
	`game` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`bonus_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bonus_hunt_call_caller_unique` ON `bonus_hunt_calls` (`hunt_id`,`kick_user_id`);--> statement-breakpoint
CREATE INDEX `bonus_hunt_calls_status_idx` ON `bonus_hunt_calls` (`hunt_id`,`status`);--> statement-breakpoint
CREATE TABLE `bonus_hunt_guesses` (
	`id` text PRIMARY KEY NOT NULL,
	`hunt_id` text NOT NULL,
	`kick_user_id` text NOT NULL,
	`kick_username` text NOT NULL,
	`guess` real NOT NULL,
	`guessed_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bonus_hunt_guess_unique` ON `bonus_hunt_guesses` (`hunt_id`,`kick_user_id`);--> statement-breakpoint
ALTER TABLE `bonus_hunt_bonuses` ADD `kind` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `bonus_hunt_bonuses` ADD `called_by` text;