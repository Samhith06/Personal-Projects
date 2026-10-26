CREATE TABLE "bonus_hunts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start_cost" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'collecting' NOT NULL,
	"requests_open" boolean DEFAULT true NOT NULL,
	"gtb_status" text DEFAULT 'closed' NOT NULL,
	"gtb_prize" text,
	"gtb_prize_paid_at" timestamp with time zone,
	"final_balance" numeric(12, 2),
	"gtb_winner_kick_id" text,
	"gtb_winner_name" text,
	"gtb_winner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	CONSTRAINT "bonus_hunts_start_cost_check" CHECK ("bonus_hunts"."start_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gtb_guesses" (
	"hunt_id" bigint NOT NULL,
	"kick_user_id" text NOT NULL,
	"kick_username" text NOT NULL,
	"guess" numeric(12, 2) NOT NULL,
	"guessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gtb_guesses_hunt_id_kick_user_id_pk" PRIMARY KEY("hunt_id","kick_user_id"),
	CONSTRAINT "gtb_guesses_guess_check" CHECK ("gtb_guesses"."guess" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hunt_bonuses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hunt_id" bigint NOT NULL,
	"slot_id" bigint,
	"slot_name" text NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"image_url" text,
	"bet" numeric(12, 2) NOT NULL,
	"payout" numeric(12, 2),
	"position" integer NOT NULL,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone,
	CONSTRAINT "hunt_bonuses_bet_check" CHECK ("hunt_bonuses"."bet" > 0),
	CONSTRAINT "hunt_bonuses_payout_check" CHECK ("hunt_bonuses"."payout" >= 0)
);
--> statement-breakpoint
CREATE TABLE "slot_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"hunt_id" bigint NOT NULL,
	"kick_user_id" text NOT NULL,
	"kick_username" text NOT NULL,
	"query" text NOT NULL,
	"slot_id" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"image_url" text,
	"play_url" text,
	"casinos" text[] DEFAULT '{}'::text[] NOT NULL,
	"bonus_buy" boolean,
	"source" text DEFAULT 'bonushunt' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slots_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tourney_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"game_id" bigint NOT NULL,
	"kick_user_id" text NOT NULL,
	"kick_username" text NOT NULL,
	"query" text NOT NULL,
	"slot_id" bigint,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tourney_games" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"size" integer NOT NULL,
	"prize" text,
	"prize_paid_at" timestamp with time zone,
	"status" text DEFAULT 'signup' NOT NULL,
	"requests_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "tourney_games_size_check" CHECK ("tourney_games"."size" IN (2, 4, 8, 16))
);
--> statement-breakpoint
CREATE TABLE "tourney_matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"game_id" bigint NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"a_entry_id" bigint,
	"b_entry_id" bigint,
	"bye" boolean DEFAULT false NOT NULL,
	"winner_entry_id" bigint,
	"decided_by" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tourney_turns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"game_id" bigint NOT NULL,
	"match_id" bigint NOT NULL,
	"entry_id" bigint,
	"side" text NOT NULL,
	"kick_username" text NOT NULL,
	"slot_id" bigint,
	"slot_name" text NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"image_url" text,
	"status" text DEFAULT 'playing' NOT NULL,
	"buy_cost" numeric(12, 2),
	"payout" numeric(12, 2),
	"drawn_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "tourney_turns_side_check" CHECK ("tourney_turns"."side" IN ('a', 'b')),
	CONSTRAINT "tourney_turns_cost_check" CHECK ("tourney_turns"."buy_cost" > 0),
	CONSTRAINT "tourney_turns_payout_check" CHECK ("tourney_turns"."payout" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bonus_hunts" ADD CONSTRAINT "bonus_hunts_gtb_winner_user_id_users_id_fk" FOREIGN KEY ("gtb_winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gtb_guesses" ADD CONSTRAINT "gtb_guesses_hunt_id_bonus_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."bonus_hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_bonuses" ADD CONSTRAINT "hunt_bonuses_hunt_id_bonus_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."bonus_hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_bonuses" ADD CONSTRAINT "hunt_bonuses_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_requests" ADD CONSTRAINT "slot_requests_hunt_id_bonus_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."bonus_hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_requests" ADD CONSTRAINT "slot_requests_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_entries" ADD CONSTRAINT "tourney_entries_game_id_tourney_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."tourney_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_entries" ADD CONSTRAINT "tourney_entries_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_matches" ADD CONSTRAINT "tourney_matches_game_id_tourney_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."tourney_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_matches" ADD CONSTRAINT "tourney_matches_a_entry_id_tourney_entries_id_fk" FOREIGN KEY ("a_entry_id") REFERENCES "public"."tourney_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_matches" ADD CONSTRAINT "tourney_matches_b_entry_id_tourney_entries_id_fk" FOREIGN KEY ("b_entry_id") REFERENCES "public"."tourney_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_matches" ADD CONSTRAINT "tourney_matches_winner_entry_id_tourney_entries_id_fk" FOREIGN KEY ("winner_entry_id") REFERENCES "public"."tourney_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_turns" ADD CONSTRAINT "tourney_turns_game_id_tourney_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."tourney_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_turns" ADD CONSTRAINT "tourney_turns_match_id_tourney_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."tourney_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_turns" ADD CONSTRAINT "tourney_turns_entry_id_tourney_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."tourney_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourney_turns" ADD CONSTRAINT "tourney_turns_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_hunts_one_live_idx" ON "bonus_hunts" USING btree (("status" <> 'finished')) WHERE "bonus_hunts"."status" <> 'finished';--> statement-breakpoint
CREATE INDEX "hunt_bonuses_hunt_idx" ON "hunt_bonuses" USING btree ("hunt_id","position");--> statement-breakpoint
CREATE INDEX "slot_requests_hunt_idx" ON "slot_requests" USING btree ("hunt_id","status","created_at");--> statement-breakpoint
CREATE INDEX "slot_requests_viewer_idx" ON "slot_requests" USING btree ("hunt_id","kick_user_id","status");--> statement-breakpoint
CREATE INDEX "slots_name_idx" ON "slots" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "slots_provider_idx" ON "slots" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "slots_added_idx" ON "slots" USING btree ("added_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tourney_entries_game_kick_idx" ON "tourney_entries" USING btree ("game_id","kick_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tourney_games_one_live_idx" ON "tourney_games" USING btree (("status" <> 'finished')) WHERE "tourney_games"."status" <> 'finished';--> statement-breakpoint
CREATE UNIQUE INDEX "tourney_matches_pos_idx" ON "tourney_matches" USING btree ("game_id","round","position");--> statement-breakpoint
CREATE INDEX "tourney_turns_match_idx" ON "tourney_turns" USING btree ("match_id","drawn_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tourney_turns_one_playing_idx" ON "tourney_turns" USING btree ("game_id") WHERE "tourney_turns"."status" = 'playing';--> statement-breakpoint
-- The classics the bonushunt.gg feed never shows (MattySpins migration 017), so !sr finds them from day one.
INSERT INTO slots (key, name, provider, source)
SELECT regexp_replace(lower(name), '[^a-z0-9]', '', 'g') || '|' ||
       regexp_replace(lower(provider), '[^a-z0-9]', '', 'g'),
       name, provider, 'manual'
  FROM (VALUES
    -- Pragmatic Play
    ('Gates of Olympus', 'Pragmatic Play'),
    ('Gates of Olympus 1000', 'Pragmatic Play'),
    ('Sweet Bonanza', 'Pragmatic Play'),
    ('Sweet Bonanza 1000', 'Pragmatic Play'),
    ('Sugar Rush', 'Pragmatic Play'),
    ('Sugar Rush 1000', 'Pragmatic Play'),
    ('Starlight Princess', 'Pragmatic Play'),
    ('Starlight Princess 1000', 'Pragmatic Play'),
    ('The Dog House', 'Pragmatic Play'),
    ('The Dog House Megaways', 'Pragmatic Play'),
    ('The Dog House Multihold', 'Pragmatic Play'),
    ('Big Bass Bonanza', 'Pragmatic Play'),
    ('Bigger Bass Bonanza', 'Pragmatic Play'),
    ('Big Bass Splash', 'Pragmatic Play'),
    ('Fruit Party', 'Pragmatic Play'),
    ('Fruit Party 2', 'Pragmatic Play'),
    ('Wild West Gold', 'Pragmatic Play'),
    ('Wild West Gold Megaways', 'Pragmatic Play'),
    ('Madame Destiny Megaways', 'Pragmatic Play'),
    ('Great Rhino Megaways', 'Pragmatic Play'),
    ('Wolf Gold', 'Pragmatic Play'),
    ('Buffalo King Megaways', 'Pragmatic Play'),
    ('Gems Bonanza', 'Pragmatic Play'),
    ('Zeus vs Hades - Gods of War', 'Pragmatic Play'),
    ('Power of Thor Megaways', 'Pragmatic Play'),
    ('Floating Dragon', 'Pragmatic Play'),
    ('Curse of the Werewolf Megaways', 'Pragmatic Play'),
    ('Release the Kraken', 'Pragmatic Play'),
    ('Chilli Heat', 'Pragmatic Play'),
    ('5 Lions Megaways', 'Pragmatic Play'),
    ('Joker''s Jewels', 'Pragmatic Play'),
    ('Mustang Gold', 'Pragmatic Play'),
    ('Muertos Multiplier Megaways', 'Pragmatic Play'),
    ('Cleocatra', 'Pragmatic Play'),
    ('Candy Blitz', 'Pragmatic Play'),
    ('Fire Portals', 'Pragmatic Play'),
    ('Twilight Princess', 'Pragmatic Play'),
    ('Book of the Fallen', 'Pragmatic Play'),
    ('Sweet Powernudge', 'Pragmatic Play'),
    ('Heist for the Golden Nuggets', 'Pragmatic Play'),
    -- Hacksaw Gaming
    ('Wanted Dead or a Wild', 'Hacksaw Gaming'),
    ('Chaos Crew', 'Hacksaw Gaming'),
    ('Chaos Crew II', 'Hacksaw Gaming'),
    ('Le Bandit', 'Hacksaw Gaming'),
    ('Le Pharaoh', 'Hacksaw Gaming'),
    ('Le Viking', 'Hacksaw Gaming'),
    ('Le King', 'Hacksaw Gaming'),
    ('Hand of Anubis', 'Hacksaw Gaming'),
    ('Dork Unit', 'Hacksaw Gaming'),
    ('RIP City', 'Hacksaw Gaming'),
    ('Stack''em', 'Hacksaw Gaming'),
    ('Beam Boys', 'Hacksaw Gaming'),
    ('Densho', 'Hacksaw Gaming'),
    ('Stick''em', 'Hacksaw Gaming'),
    ('Itero', 'Hacksaw Gaming'),
    ('Gladiator Legends', 'Hacksaw Gaming'),
    ('Rotten', 'Hacksaw Gaming'),
    ('Frutz', 'Hacksaw Gaming'),
    ('Joker Bombs', 'Hacksaw Gaming'),
    ('Cubes 2', 'Hacksaw Gaming'),
    ('Miami Multiplier', 'Hacksaw Gaming'),
    ('Toshi Video Club', 'Hacksaw Gaming'),
    ('Duel at Dawn', 'Hacksaw Gaming'),
    ('Twisted Lab', 'Hacksaw Gaming'),
    ('Xpander', 'Hacksaw Gaming'),
    ('Pray For Three', 'Hacksaw Gaming'),
    ('Rad Maxx', 'Hacksaw Gaming'),
    ('Klowns', 'Hacksaw Gaming'),
    ('Magic Piggy', 'Hacksaw Gaming'),
    ('Cash Crew', 'Hacksaw Gaming'),
    ('Om Nom', 'Hacksaw Gaming'),
    ('Keep''em', 'Hacksaw Gaming'),
    -- Nolimit City
    ('Mental', 'Nolimit City'),
    ('Mental 2', 'Nolimit City'),
    ('San Quentin xWays', 'Nolimit City'),
    ('San Quentin 2: Death Row', 'Nolimit City'),
    ('Tombstone', 'Nolimit City'),
    ('Tombstone RIP', 'Nolimit City'),
    ('Tombstone Slaughter', 'Nolimit City'),
    ('Fire in the Hole xBomb', 'Nolimit City'),
    ('Fire in the Hole 2', 'Nolimit City'),
    ('Fire in the Hole 3', 'Nolimit City'),
    ('Deadwood', 'Nolimit City'),
    ('Deadwood R.I.P', 'Nolimit City'),
    ('Punk Rocker', 'Nolimit City'),
    ('Punk Toilet', 'Nolimit City'),
    ('Folsom Prison', 'Nolimit City'),
    ('East Coast vs West Coast', 'Nolimit City'),
    ('Das xBoot', 'Nolimit City'),
    ('xWays Hoarder xSplit', 'Nolimit City'),
    ('Misery Mining', 'Nolimit City'),
    ('Book of Shadows', 'Nolimit City'),
    ('Karen Maneater', 'Nolimit City'),
    ('Serial', 'Nolimit City'),
    ('Remember Gulag', 'Nolimit City'),
    ('Kiss My Chainsaw', 'Nolimit City'),
    ('Blood & Shadow', 'Nolimit City'),
    ('Bushido Ways xNudge', 'Nolimit City'),
    ('Infectious 5 xWays', 'Nolimit City'),
    ('Poison Eve', 'Nolimit City'),
    ('El Paso Gunfight xNudge', 'Nolimit City'),
    ('Barbarian Fury', 'Nolimit City'),
    ('Pixies vs Pirates', 'Nolimit City'),
    ('Dungeon Quest', 'Nolimit City'),
    ('Warrior Graveyard xNudge', 'Nolimit City'),
    ('Evil Goblins xBomb', 'Nolimit City'),
    ('Gluttony', 'Nolimit City'),
    ('Duck Hunters', 'Nolimit City'),
    ('Hot Nudge', 'Nolimit City'),
    ('Tractor Beam', 'Nolimit City'),
    ('The Crypt', 'Nolimit City'),
    ('Nine to Five', 'Nolimit City'),
    ('Outsourced', 'Nolimit City'),
    ('Stockholm Syndrome', 'Nolimit City'),
    ('Beheaded', 'Nolimit City'),
    ('Disturbed', 'Nolimit City'),
    ('Rock Bottom', 'Nolimit City'),
    -- Relax Gaming
    ('Money Train 2', 'Relax Gaming'),
    ('Money Train 3', 'Relax Gaming'),
    ('Money Train 4', 'Relax Gaming'),
    ('Temple Tumble Megaways', 'Relax Gaming'),
    ('Iron Bank', 'Relax Gaming'),
    ('Dead Man''s Trail', 'Relax Gaming'),
    ('Hellcatraz', 'Relax Gaming'),
    ('Snake Arena', 'Relax Gaming'),
    ('Book of 99', 'Relax Gaming'),
    -- Push Gaming
    ('Jammin'' Jars', 'Push Gaming'),
    ('Jammin'' Jars 2', 'Push Gaming'),
    ('Razor Shark', 'Push Gaming'),
    ('Razor Returns', 'Push Gaming'),
    ('Fat Rabbit', 'Push Gaming'),
    ('Fat Banker', 'Push Gaming'),
    ('Wild Swarm', 'Push Gaming'),
    ('Retro Tapes', 'Push Gaming'),
    ('Mount Magmas', 'Push Gaming'),
    ('Big Bamboo', 'Push Gaming'),
    ('Fire Hopper', 'Push Gaming'),
    ('Tiki Tumble', 'Push Gaming'),
    ('Dinopolis', 'Push Gaming'),
    -- Big Time Gaming
    ('Bonanza', 'Big Time Gaming'),
    ('Extra Chilli', 'Big Time Gaming'),
    ('White Rabbit', 'Big Time Gaming'),
    ('Danger High Voltage', 'Big Time Gaming'),
    ('Who Wants to Be a Millionaire', 'Big Time Gaming'),
    ('Lil Devil', 'Big Time Gaming'),
    -- Play'n Go
    ('Book of Dead', 'Play''n Go'),
    ('Legacy of Dead', 'Play''n Go'),
    ('Rise of Olympus', 'Play''n Go'),
    ('Rise of Olympus 100', 'Play''n Go'),
    ('Reactoonz', 'Play''n Go'),
    ('Reactoonz 2', 'Play''n Go'),
    ('Moon Princess', 'Play''n Go'),
    ('Fire Joker', 'Play''n Go'),
    ('Gemix', 'Play''n Go'),
    ('Rich Wilde and the Tome of Madness', 'Play''n Go'),
    -- NetEnt
    ('Starburst', 'NetEnt'),
    ('Gonzo''s Quest', 'NetEnt'),
    ('Dead or Alive', 'NetEnt'),
    ('Dead or Alive 2', 'NetEnt'),
    ('Twin Spin', 'NetEnt'),
    ('Divine Fortune', 'NetEnt'),
    ('Blood Suckers', 'NetEnt'),
    ('Mega Fortune', 'NetEnt'),
    -- ELK Studios
    ('Cygnus', 'ELK Studios'),
    ('Cygnus 2', 'ELK Studios'),
    ('Wild Toro', 'ELK Studios'),
    ('Wild Toro 2', 'ELK Studios'),
    ('Pirots', 'ELK Studios'),
    ('Pirots 2', 'ELK Studios'),
    ('Pirots 3', 'ELK Studios'),
    ('Ecuador Gold', 'ELK Studios'),
    ('Katmandu Gold', 'ELK Studios'),
    -- Red Tiger Gaming
    ('Gonzo''s Quest Megaways', 'Red Tiger Gaming'),
    ('Piggy Riches Megaways', 'Red Tiger Gaming'),
    ('Pirates'' Plenty', 'Red Tiger Gaming'),
    -- Thunderkick
    ('Esqueleto Explosivo', 'Thunderkick'),
    ('Esqueleto Explosivo 2', 'Thunderkick'),
    ('Midas Golden Touch', 'Thunderkick'),
    ('Pink Elephants', 'Thunderkick'),
    ('Pink Elephants 2', 'Thunderkick'),
    -- Yggdrasil
    ('Vikings Go Berzerk', 'Yggdrasil'),
    ('Valley of the Gods', 'Yggdrasil'),
    ('Raptor DoubleMax', 'Yggdrasil'),
    -- Quickspin
    ('Big Bad Wolf', 'Quickspin'),
    ('Sakura Fortune', 'Quickspin'),
    -- PG Soft
    ('Mahjong Ways', 'PG Soft'),
    ('Mahjong Ways 2', 'PG Soft'),
    ('Fortune Tiger', 'PG Soft'),
    ('Fortune Ox', 'PG Soft'),
    ('Fortune Rabbit', 'PG Soft'),
    ('Lucky Neko', 'PG Soft'),
    ('Treasures of Aztec', 'PG Soft'),
    -- BGaming
    ('Elvis Frog in Vegas', 'BGaming')
  ) AS classics(name, provider)
ON CONFLICT (key) DO NOTHING;
