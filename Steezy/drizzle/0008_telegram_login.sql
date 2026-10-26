ALTER TABLE "users" ALTER COLUMN "discord_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "discord_username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_photo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_linked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_telegram_id_idx" ON "users" USING btree ("telegram_id");