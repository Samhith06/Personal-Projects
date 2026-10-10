-- Data migration, not a schema change.
--
-- Removes the placeholder content the first release seeded, ahead of launch.
-- Invented figures are a liability on a site about gambling: a fabricated
-- "$249,000 biggest win" or a $4.2M community wager reads as a claim.
--
-- Every delete names the seed's own ids. Rows an admin created carry a random
-- suffix (`clip-3f2a9c1e`), so nothing anyone actually wrote is matched — the
-- live challenge, the real activity entries and the synced leaderboard all
-- survive untouched. Re-running changes nothing.

-- Short-form and Wall of Fame samples.
DELETE FROM `clips` WHERE `id` IN (
  'clip-olympus','clip-tigers-max','clip-sugar-heist','clip-bloopers','clip-supercut','clip-bonus-buy',
  'clip-pharaoh','clip-grind-finale','clip-viewer-chaos','clip-double-down','clip-frozen-crown','clip-community-night'
);--> statement-breakpoint
DELETE FROM `wins` WHERE `id` IN (
  'win-tigers-max','win-sugar-heist','win-olympus','win-deep-sea','win-pharaoh',
  'win-frozen-crown','win-crypt','win-neon','win-community-300'
);--> statement-breakpoint

-- Invented broadcast history.
DELETE FROM `past_streams` WHERE `id` IN (
  'ps-1','ps-2','ps-3','ps-4','ps-5','ps-6','ps-7','ps-8','ps-9','ps-10','ps-11','ps-12','ps-13'
);--> statement-breakpoint

-- Sample raffles, and any entries attached to them.
DELETE FROM `raffle_entries` WHERE `raffle_id` IN ('rf-rig','rf-cash','rf-console','rf-vegas','rf-chips','rf-watch','rf-summer');--> statement-breakpoint
DELETE FROM `raffles` WHERE `id` IN ('rf-rig','rf-cash','rf-console','rf-vegas','rf-chips','rf-watch','rf-summer');--> statement-breakpoint

-- Sample challenges. The crew's own challenges have generated ids and stay.
DELETE FROM `challenge_entries` WHERE `challenge_id` IN ('ch-weekend','ch-grind','ch-100k','ch-champ','ch-august');--> statement-breakpoint
DELETE FROM `challenges` WHERE `id` IN ('ch-weekend','ch-grind','ch-100k','ch-champ','ch-august');--> statement-breakpoint

-- Sample announcements. One of these still pointed at /schedule, which no
-- longer exists, and the other described a reward tier that was replaced.
DELETE FROM `announcements` WHERE `id` IN ('an-collab','an-lounge');--> statement-breakpoint

-- Seeded activity-feed entries only; real ones are left in place.
DELETE FROM `activity` WHERE `id` IN ('ac-1','ac-2','ac-3','ac-4','ac-5','ac-6','ac-7','ac-8','ac-9');--> statement-breakpoint

-- Sample giveaway payouts, so the board's total counts real money only.
DELETE FROM `giveaways` WHERE `id` IN (
  'gv-1','gv-2','gv-3','gv-4','gv-5','gv-6','gv-7','gv-8','gv-9','gv-10','gv-11','gv-12'
);--> statement-breakpoint

-- Invented community counters.
DELETE FROM `community_stats` WHERE `key` IN ('totalWager','monthWager','prizesAwarded','activeMembers','activeChallenges');--> statement-breakpoint

-- Fabricated standings.
--
-- The seeded rows are named `today-1` … `alltime-10`, so they are listed one
-- by one: an admin adding a row by hand gets `week-3f2a9c1e`, which a
-- `LIKE 'week-%'` sweep would have taken with it. The 'month' board is owned
-- by the affiliate sheet sync and is not touched at all.
DELETE FROM `leaderboard_entries` WHERE `id` IN (
  'today-1', 'today-2', 'today-3', 'today-4', 'today-5', 'today-6', 'today-7', 'today-8', 'today-9', 'today-10', 'week-1', 'week-2', 'week-3', 'week-4', 'week-5', 'week-6', 'week-7', 'week-8', 'week-9', 'week-10', 'alltime-1', 'alltime-2', 'alltime-3', 'alltime-4', 'alltime-5', 'alltime-6', 'alltime-7', 'alltime-8', 'alltime-9', 'alltime-10'
);--> statement-breakpoint

-- The boards themselves are kept, so the period tabs keep their names; only
-- the invented pool and totals are cleared.
UPDATE `leaderboard_boards`
   SET `prize_pool` = 0, `total_wagered` = 0, `next_target` = 0, `next_reward` = ''
 WHERE `period` IN ('today','week','alltime');--> statement-breakpoint

-- Invented channel numbers. The profiles, names, handles and bios stay; only
-- the figures nobody supplied are cleared, and the site hides a stat at zero
-- rather than printing it.
UPDATE `streamers` SET
  `followers` = 0,
  `avg_viewers` = 0,
  `peak_viewers` = 0,
  `streams_this_month` = 0,
  `month_wager` = 0,
  `all_time_wager` = 0,
  `biggest_win` = 0,
  `biggest_win_game` = '',
  `raffles_hosted` = 0;--> statement-breakpoint

-- Homepage picks that named rows deleted above.
--
-- The featured clip and win lists are left alone on purpose: an id that no
-- longer resolves is already ignored when the homepage is built, and matching
-- them by prefix would have cleared a selection of real content too.
UPDATE `site_settings` SET `featured_challenge_id` = NULL WHERE `featured_challenge_id` IN ('ch-weekend','ch-grind','ch-100k','ch-champ','ch-august');--> statement-breakpoint
UPDATE `site_settings` SET `featured_raffle_id` = NULL WHERE `featured_raffle_id` IN ('rf-rig','rf-cash','rf-console','rf-vegas','rf-chips','rf-watch','rf-summer');--> statement-breakpoint
UPDATE `site_settings` SET `featured_announcement_id` = NULL WHERE `featured_announcement_id` IN ('an-collab','an-lounge');
