-- Email verification for licensing-platform accounts. A person must prove
-- control of their email before a domain-matched company join is auto-activated
-- (see membership/service.ts joinCompany) — closing an unverified-email tenant
-- takeover. Additive/nullable: existing accounts are simply unverified until
-- they confirm; login is NOT gated on this (no lockout), only domain auto-join.
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "email_verify_token" text;
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "email_verify_expires" timestamp with time zone;
