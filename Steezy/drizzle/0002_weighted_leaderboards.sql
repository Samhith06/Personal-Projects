ALTER TABLE "leaderboards" ALTER COLUMN "metric" SET DEFAULT 'weighted';--> statement-breakpoint
-- Boards that haven't been frozen switch to weighted wager; frozen results stay as they were paid.
UPDATE "leaderboards" SET "metric" = 'weighted' WHERE "status" IN ('draft', 'live');
