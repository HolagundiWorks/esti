-- Platform account profile (signup capture) + lifecycle status for licence manager.
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "profile" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "hlp_account_status_idx" ON "hlp_account" ("status");
