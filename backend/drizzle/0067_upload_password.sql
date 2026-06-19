ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "upload_password_required" boolean NOT NULL DEFAULT false;

ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "upload_password_hash" text;
