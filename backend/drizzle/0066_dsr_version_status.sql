ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PUBLISHED' NOT NULL;
--> statement-breakpoint
UPDATE "esti_dsr_version" SET "status" = 'PUBLISHED' WHERE "status" IS NULL OR "status" = '';
