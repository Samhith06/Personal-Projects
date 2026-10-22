CREATE TABLE "abuse_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"related_user_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"rule" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "badges_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "chat_activity" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"kick_message_id" text NOT NULL,
	"kick_user_id" text NOT NULL,
	"kick_username" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"content_hash" text NOT NULL,
	"counted" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_entries" (
	"giveaway_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "giveaway_entries_giveaway_id_user_id_pk" PRIMARY KEY("giveaway_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "giveaway_winners" (
	"giveaway_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "giveaway_winners_giveaway_id_position_pk" PRIMARY KEY("giveaway_id","position")
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"prize" text NOT NULL,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entry_keyword" text,
	"winners_count" integer DEFAULT 1 NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"seed_hash" text,
	"seed" text,
	"overlay_token" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"drawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kick_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"matched_kick_user_id" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leaderboard_results" (
	"leaderboard_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"roobet_uid" text NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"wagered" numeric(14, 2) NOT NULL,
	"prize" numeric(14, 2) DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "leaderboard_results_leaderboard_id_rank_pk" PRIMARY KEY("leaderboard_id","rank")
);
--> statement-breakpoint
CREATE TABLE "leaderboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"metric" text DEFAULT 'wagered' NOT NULL,
	"min_wager" numeric(14, 2) DEFAULT 0 NOT NULL,
	"prizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mask_names" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_by" uuid
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"threshold" numeric(14, 2) NOT NULL,
	"reward" numeric(14, 2) NOT NULL,
	"metric" text DEFAULT 'lifetime' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffle_tickets" (
	"raffle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tickets" integer NOT NULL,
	"wagered" numeric(14, 2) DEFAULT 0 NOT NULL,
	CONSTRAINT "raffle_tickets_raffle_id_user_id_pk" PRIMARY KEY("raffle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "raffle_winners" (
	"raffle_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"prize" numeric(14, 2) NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "raffle_winners_raffle_id_position_pk" PRIMARY KEY("raffle_id","position")
);
--> statement-breakpoint
CREATE TABLE "raffles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"metric" text DEFAULT 'wagered' NOT NULL,
	"usd_per_ticket" numeric(14, 2) DEFAULT 1000 NOT NULL,
	"max_tickets_per_user" integer DEFAULT 100 NOT NULL,
	"prizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seed_hash" text,
	"seed" text,
	"overlay_token" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"drawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roobet_daily_wager" (
	"roobet_uid" text NOT NULL,
	"day" date NOT NULL,
	"username" text NOT NULL,
	"wagered" numeric(14, 2) DEFAULT 0 NOT NULL,
	"weighted_wagered" numeric(14, 2) DEFAULT 0 NOT NULL,
	"highest_multiplier" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roobet_daily_wager_roobet_uid_day_pk" PRIMARY KEY("roobet_uid","day")
);
--> statement-breakpoint
CREATE TABLE "roobet_links" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"requested_username" text NOT NULL,
	"roobet_uid" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kick_livestream_id" text,
	"title" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"key" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_ok_at" timestamp with time zone,
	"last_error" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_fingerprints" (
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"hash" text NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_fingerprints_user_id_kind_hash_pk" PRIMARY KEY("user_id","kind","hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"discord_global_name" text,
	"discord_avatar" text,
	"role" text DEFAULT 'member' NOT NULL,
	"kick_user_id" text,
	"kick_username" text,
	"kick_link_method" text,
	"kick_linked_at" timestamp with time zone,
	"age_confirmed_at" timestamp with time zone,
	"tos_version" text,
	"tos_accepted_at" timestamp with time zone,
	"wager_public" boolean DEFAULT false NOT NULL,
	"name_on_leaderboards" boolean DEFAULT true NOT NULL,
	"blocked_from_rewards" boolean DEFAULT false NOT NULL,
	"staff_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_time" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "watch_time_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "abuse_flags" ADD CONSTRAINT "abuse_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_flags" ADD CONSTRAINT "abuse_flags_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_flags" ADD CONSTRAINT "abuse_flags_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_activity" ADD CONSTRAINT "chat_activity_session_id_stream_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stream_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_winners" ADD CONSTRAINT "giveaway_winners_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_winners" ADD CONSTRAINT "giveaway_winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kick_verifications" ADD CONSTRAINT "kick_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_leaderboard_id_leaderboards_id_fk" FOREIGN KEY ("leaderboard_id") REFERENCES "public"."leaderboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_claims" ADD CONSTRAINT "milestone_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_claims" ADD CONSTRAINT "milestone_claims_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_claims" ADD CONSTRAINT "milestone_claims_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_winners" ADD CONSTRAINT "raffle_winners_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_winners" ADD CONSTRAINT "raffle_winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roobet_links" ADD CONSTRAINT "roobet_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roobet_links" ADD CONSTRAINT "roobet_links_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fingerprints" ADD CONSTRAINT "user_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_time" ADD CONSTRAINT "watch_time_session_id_stream_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stream_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_time" ADD CONSTRAINT "watch_time_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abuse_flags_status_idx" ON "abuse_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_activity_message_idx" ON "chat_activity" USING btree ("kick_message_id");--> statement-breakpoint
CREATE INDEX "chat_activity_session_user_idx" ON "chat_activity" USING btree ("session_id","kick_user_id","at");--> statement-breakpoint
CREATE INDEX "kick_verif_code_idx" ON "kick_verifications" USING btree ("code","status");--> statement-breakpoint
CREATE INDEX "kick_verif_user_idx" ON "kick_verifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_claims_once_idx" ON "milestone_claims" USING btree ("user_id","milestone_id");--> statement-breakpoint
CREATE INDEX "roobet_daily_day_idx" ON "roobet_daily_wager" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "roobet_links_uid_idx" ON "roobet_links" USING btree ("roobet_uid");--> statement-breakpoint
CREATE INDEX "roobet_links_status_idx" ON "roobet_links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stream_sessions_started_idx" ON "stream_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stream_sessions_one_open_idx" ON "stream_sessions" USING btree (("ended_at" is null)) WHERE "stream_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "user_fingerprints_hash_idx" ON "user_fingerprints" USING btree ("kind","hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_id_idx" ON "users" USING btree ("discord_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_kick_user_id_idx" ON "users" USING btree ("kick_user_id");--> statement-breakpoint
CREATE INDEX "watch_time_user_idx" ON "watch_time" USING btree ("user_id");