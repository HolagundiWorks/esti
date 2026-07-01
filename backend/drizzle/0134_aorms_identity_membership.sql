-- AORMS Identity I-3 — activation lifecycle on membership. A person is INVITED
-- into a company, becomes ACTIVE on acceptance, and is LEFT when they move on.
-- Only ACTIVE memberships may sign in (enforced in the tenant resolver). Additive;
-- every existing member is backfilled ACTIVE as of when they were created.
ALTER TABLE "hlp_org_member" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "hlp_org_member" ADD COLUMN IF NOT EXISTS "activated_at" timestamp with time zone;
ALTER TABLE "hlp_org_member" ADD COLUMN IF NOT EXISTS "left_at" timestamp with time zone;

UPDATE "hlp_org_member"
   SET "activated_at" = COALESCE("activated_at", "created_at")
 WHERE "status" = 'ACTIVE' AND "activated_at" IS NULL;
