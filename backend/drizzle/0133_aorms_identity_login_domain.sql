-- AORMS Identity I-2 — tenant-first login. A company can advertise a login
-- domain (e.g. acme.in) and/or an alternate login email so Step-1 can resolve
-- the tenant from what a person types. Additive + nullable; resolution also
-- accepts the AORMS-C- handle and the slug, so this is optional per org.
ALTER TABLE "hlp_organization" ADD COLUMN IF NOT EXISTS "login_domain" text;
ALTER TABLE "hlp_organization" ADD COLUMN IF NOT EXISTS "login_email" text;
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_organization_login_domain_idx"
  ON "hlp_organization" ("login_domain");
