ALTER TABLE "giveaway_winners" ADD COLUMN "denied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leaderboard_results" ADD COLUMN "denied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "raffle_winners" ADD COLUMN "denied_at" timestamp with time zone;