ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'STATE';
ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "state_code" text;
