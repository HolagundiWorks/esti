-- Two-factor authenticator (TOTP) for platform accounts. Null = disabled; a
-- base32 secret = enabled (a verified code is required at login). Additive.
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "totp_secret" text;
