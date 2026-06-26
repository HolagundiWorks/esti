-- Phase B licensing (B-LIC-2/3).
-- Hub-side authority tables + node-side cached-license columns. Idempotent.

CREATE TABLE IF NOT EXISTS "esti_license" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "firm_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "plan" text NOT NULL,
  "seats" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "max_installs" integer DEFAULT 1 NOT NULL,
  "expires_at" timestamptz,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "esti_license_key_unique" UNIQUE ("key")
);

CREATE TABLE IF NOT EXISTS "esti_license_install" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "license_id" uuid NOT NULL REFERENCES "esti_license"("id") ON DELETE CASCADE,
  "install_id" text NOT NULL,
  "sync_token_hash" text NOT NULL,
  "fingerprint" text,
  "last_seen_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_license_install_uniq"
  ON "esti_license_install" ("license_id", "install_id");

-- Node-side cached license + sync credentials on the singleton org-settings row.
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "license_token" text;
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "install_id" text;
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "sync_token" text;
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "license_checked_at" timestamptz;
