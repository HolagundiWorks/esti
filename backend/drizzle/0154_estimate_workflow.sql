-- 0154 — Estimate workflow + revisions. Estimates move IN_PROGRESS → FOR_REVIEW
-- → APPROVED; approved is immutable and revised by cloning (revision_no/of).
-- Migrate legacy DRAFT rows to IN_PROGRESS and switch the default. Idempotent.
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "revision_no" integer NOT NULL DEFAULT 0;
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "revision_of" uuid;
UPDATE "esti_estimate" SET "status" = 'IN_PROGRESS' WHERE "status" = 'DRAFT';
ALTER TABLE "esti_estimate" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
