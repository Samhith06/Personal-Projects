CREATE TABLE "hunt_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hunt_id" text NOT NULL,
	"kick_user_id" text NOT NULL,
	"kick_username" text NOT NULL,
	"slot" text NOT NULL,
	"slot_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"kick_user_id" text,
	"kick_username" text NOT NULL,
	"slot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "status" SET DEFAULT 'signup';--> statement-breakpoint
ALTER TABLE "hunts" ADD COLUMN "requests_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "buys" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "cost" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD COLUMN "payout" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "size" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "requests_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "finished_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hunt_requests" ADD CONSTRAINT "hunt_requests_hunt_id_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hunt_requests_once_idx" ON "hunt_requests" USING btree ("hunt_id","kick_user_id","slot_key");--> statement-breakpoint
CREATE INDEX "hunt_requests_hunt_idx" ON "hunt_requests" USING btree ("hunt_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_entries_kick_idx" ON "tournament_entries" USING btree ("tournament_id","kick_user_id");--> statement-breakpoint
-- Draft brackets were typed in by staff; carry their players over as sign-ups and redraw on start.
INSERT INTO "tournament_entries" ("tournament_id", "kick_username", "slot")
SELECT m."tournament_id", p."player", coalesce(p."slot", 'Unknown slot')
FROM "tournament_matches" m
JOIN "tournaments" t ON t."id" = m."tournament_id" AND t."status" = 'draft'
CROSS JOIN LATERAL (VALUES (m."player_a", m."slot_a"), (m."player_b", m."slot_b")) AS p("player", "slot")
WHERE m."round" = 1 AND p."player" IS NOT NULL;--> statement-breakpoint
DELETE FROM "tournament_matches" WHERE "tournament_id" IN (SELECT "id" FROM "tournaments" WHERE "status" = 'draft');--> statement-breakpoint
UPDATE "tournaments" SET "status" = 'signup' WHERE "status" = 'draft';--> statement-breakpoint
UPDATE "tournaments" SET "started_at" = "created_at" WHERE "status" IN ('live', 'finished');--> statement-breakpoint
UPDATE "tournaments" SET "finished_at" = "created_at" WHERE "status" = 'finished';
