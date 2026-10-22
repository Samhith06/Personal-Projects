CREATE TABLE "hunt_guesses" (
	"hunt_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hunt_guesses_hunt_id_user_id_pk" PRIMARY KEY("hunt_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "hunts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"casino" text,
	"start_cost" numeric(14, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_opening" boolean DEFAULT false NOT NULL,
	"current_opening_slot" text,
	"completed" boolean DEFAULT false NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bonuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remote_created_at" timestamp with time zone NOT NULL,
	"remote_updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"guesses_open" boolean DEFAULT true NOT NULL,
	"guess_prize" text,
	"winner_user_id" uuid,
	"winner_guess" numeric(14, 2),
	"settled_at" timestamp with time zone,
	"prize_paid_at" timestamp with time zone,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"slot" integer NOT NULL,
	"player_a" text,
	"slot_a" text,
	"multi_a" numeric(12, 2),
	"player_b" text,
	"slot_b" text,
	"multi_b" numeric(12, 2),
	"winner" text
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"prize" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hunt_guesses" ADD CONSTRAINT "hunt_guesses_hunt_id_hunts_id_fk" FOREIGN KEY ("hunt_id") REFERENCES "public"."hunts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunt_guesses" ADD CONSTRAINT "hunt_guesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunts" ADD CONSTRAINT "hunts_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hunts_created_idx" ON "hunts" USING btree ("remote_created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_matches_pos_idx" ON "tournament_matches" USING btree ("tournament_id","round","slot");