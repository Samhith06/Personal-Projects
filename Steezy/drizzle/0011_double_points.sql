CREATE TABLE "wager_boost_totals" (
	"boost_id" uuid NOT NULL,
	"roobet_uid" text NOT NULL,
	"username" text NOT NULL,
	"wagered" numeric(14, 2) DEFAULT 0 NOT NULL,
	"weighted_wagered" numeric(14, 2) DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wager_boost_totals_boost_id_roobet_uid_pk" PRIMARY KEY("boost_id","roobet_uid")
);
--> statement-breakpoint
CREATE TABLE "wager_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"multiplier" numeric(4, 2) DEFAULT 2 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"created_by" uuid,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wager_boost_totals" ADD CONSTRAINT "wager_boost_totals_boost_id_wager_boosts_id_fk" FOREIGN KEY ("boost_id") REFERENCES "public"."wager_boosts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD CONSTRAINT "wager_boosts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wager_boosts_starts_idx" ON "wager_boosts" USING btree ("starts_at");