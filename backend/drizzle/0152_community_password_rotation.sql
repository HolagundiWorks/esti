-- Community edition: preloaded accounts must rotate their password on first login.
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false;
