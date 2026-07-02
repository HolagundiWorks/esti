-- AORMS Identity I-5 — firm-user projection. A firm staff row (esti_user) can
-- carry the person's portable AORMS-U handle, so the firm sees a team member
-- while certifications + growth live centrally on the person. Additive + nullable;
-- existing firm users are simply unlinked until an owner links them.
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "account_public_id" text;
CREATE INDEX IF NOT EXISTS "esti_user_account_public_id_idx"
  ON "esti_user" ("account_public_id");
