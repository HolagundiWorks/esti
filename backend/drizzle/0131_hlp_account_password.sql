-- Email+password auth for the licensing platform (replaces Google-only sign-in).
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "password_hash" text;
