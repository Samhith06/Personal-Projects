-- Data migration, not a schema change.
--
-- The published VIP ladder replaces the old six-tier milestone set, and
-- DaddyKong Gaming joins the crew. Both are content the streamers asked for
-- directly, so they ship with the release rather than waiting to be typed into
-- the admin panel on every environment. Everything here is written so a second
-- run changes nothing.

-- The twelve published tiers: a monthly wager target and the cash it pays.
DELETE FROM `milestones`;--> statement-breakpoint
INSERT INTO `milestones` ("id", "name", "threshold", "cash_reward", "reward", "perk", "sort_order") VALUES
  ('ms-starter',  'Starter',   5000,    5,    '$5 cash reward',     '', 1),
  ('ms-rookie',   'Rookie',    10000,   10,   '$10 cash reward',    '', 2),
  ('ms-bronze',   'Bronze',    25000,   25,   '$25 cash reward',    '', 3),
  ('ms-silver',   'Silver',    50000,   50,   '$50 cash reward',    '', 4),
  ('ms-gold',     'Gold',      100000,  100,  '$100 cash reward',   'Your own VIP host in the FGDR Discord', 5),
  ('ms-platinum', 'Platinum',  250000,  250,  '$250 cash reward',   '', 6),
  ('ms-diamond',  'Diamond',   500000,  500,  '$500 cash reward',   '', 7),
  ('ms-master',   'Master',    750000,  750,  '$750 cash reward',   '', 8),
  ('ms-elite',    'Elite',     1000000, 1000, '$1,000 cash reward', '', 9),
  ('ms-champion', 'Champion',  1500000, 1500, '$1,500 cash reward', '', 10),
  ('ms-legend',   'Legend',    2000000, 2000, '$2,000 cash reward', '', 11),
  ('ms-immortal', 'Immortal',  5000000, 5000, '$5,000 cash reward', '', 12);--> statement-breakpoint

-- The fifth channel. Left alone if an admin has already added it by hand.
INSERT OR IGNORE INTO `streamers`
  ("id", "display_name", "monogram", "role", "tagline", "bio", "chapter_title", "quote", "specialty",
   "biggest_win_game", "accent", "sort_order", "avatar_url", "kick_username", "kick_url")
VALUES (
  'daddykonggaming',
  'DaddyKong Gaming',
  'DK',
  'Slots · Giveaways',
  'Big bets, bigger giveaways. 🦍🔴',
  'The gorilla in the high-limit room — heavy stakes, heavier reactions, and a habit of handing the winnings straight back to chat.',
  'The heavyweight',
  'Big bets, bigger giveaways. 🦍🔴',
  'Bonus buys & viewer giveaways',
  'Gorilla Mayhem',
  'ruby',
  5,
  '/brand/daddykonggaming.png',
  'daddykonggaming',
  'https://kick.com/daddykonggaming'
);

--> statement-breakpoint
-- The crew is five now. Only touched if an admin has not already reworded it.
UPDATE `site_settings`
   SET `hero_tagline` = 'One crew. Every creator. One community.'
 WHERE `hero_tagline` = 'Four creators. One crew. One community.';
