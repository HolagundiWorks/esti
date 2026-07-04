-- 0156 — Estimate line specification mapping. Each line can carry a chosen KB
-- specification (mix/method), mapped after approval, for costing (priced BOQ +
-- material abstract). Idempotent.
ALTER TABLE "esti_estimate_line"
  ADD COLUMN IF NOT EXISTS "specification_id" uuid
  REFERENCES "esti_kb_specification"("id") ON DELETE SET NULL;
