-- 0157 — BOQ PDF export. The priced BOQ + material abstract is frozen to a
-- snapshot at generation time and rendered to a letterhead PDF by the worker.
-- Idempotent.
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "boq_snapshot" jsonb;
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "boq_pdf_key" text;
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "boq_pdf_status" text NOT NULL DEFAULT 'NONE';
