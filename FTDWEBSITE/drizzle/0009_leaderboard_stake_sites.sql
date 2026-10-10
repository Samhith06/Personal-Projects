ALTER TABLE `leaderboard_boards` ADD `prize_ladder` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `leaderboard_boards` SET `period` = 'stake-com', `prize_ladder` = '600,250,170,120,90,75,65,55,45,30' WHERE `period` = 'month';--> statement-breakpoint
UPDATE `leaderboard_entries` SET `period` = 'stake-com' WHERE `period` = 'month';
