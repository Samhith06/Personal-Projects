CREATE TABLE "wager_boost_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"multiplier" numeric(4, 2) DEFAULT 2 NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"time_zone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD COLUMN "occurrence_key" text;--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD COLUMN "announced_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD COLUMN "announced_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wager_boost_schedules" ADD CONSTRAINT "wager_boost_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wager_boosts" ADD CONSTRAINT "wager_boosts_schedule_id_wager_boost_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."wager_boost_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wager_boosts_occurrence_idx" ON "wager_boosts" USING btree ("occurrence_key");