CREATE TABLE `stake_wager_days` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`window_start` text NOT NULL,
	`day` text NOT NULL,
	`wagered` real DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stake_wager_days_unique` ON `stake_wager_days` (`username`,`window_start`,`day`);--> statement-breakpoint
CREATE INDEX `stake_wager_days_day_idx` ON `stake_wager_days` (`day`);