DROP TABLE "hunt_guesses" CASCADE;--> statement-breakpoint
DROP TABLE "hunt_requests" CASCADE;--> statement-breakpoint
DROP TABLE "hunts" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_entries" CASCADE;--> statement-breakpoint
DROP TABLE "tournament_matches" CASCADE;--> statement-breakpoint
DROP TABLE "tournaments" CASCADE;--> statement-breakpoint
-- The bonushunt.gg hunt mirror and the old token overlay are gone with them.
DELETE FROM "settings" WHERE "key" = 'hunt.overlayToken';--> statement-breakpoint
DELETE FROM "sync_state" WHERE "key" = 'bonushunt';
