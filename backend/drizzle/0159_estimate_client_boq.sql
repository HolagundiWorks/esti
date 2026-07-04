-- 0159 — Client-copy BOQ PDF. A second render of the priced BOQ without the
-- internal material/labour abstracts, stored separately so both coexist.
-- Idempotent.
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "boq_client_pdf_key" text;
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "boq_client_pdf_status" text NOT NULL DEFAULT 'NONE';
