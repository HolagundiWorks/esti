-- Self-serve password reset for workspace logins (esti_user). One-shot hashed
-- token + expiry, cleared on use — replaces the admin-only manual reset as the
-- default "forgot password" path. Additive/nullable.
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "password_reset_token" text;
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "password_reset_expires" timestamp with time zone;
