-- Org operating mode (solo vs studio) and immutable HR archive snapshots.
ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "org_mode" text DEFAULT 'SOLO' NOT NULL;

UPDATE "esti_orgsettings"
SET "org_mode" = 'STUDIO'
WHERE "hr_enabled" = true AND "org_mode" = 'SOLO';

CREATE TABLE IF NOT EXISTS "esti_hr_archive" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_id" uuid REFERENCES "esti_user"("id"),
  "reason" text,
  "snapshot" jsonb NOT NULL,
  "tasks_remapped" integer DEFAULT 0 NOT NULL,
  "members_archived" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "esti_hr_archive_created_at_idx"
  ON "esti_hr_archive" ("created_at" DESC);
