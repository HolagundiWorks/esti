-- 0157 — Brand-specific material rate. A preferred brand may carry its own rate
-- (paise/material unit) that overrides the material default in estimate costing.
-- Idempotent.
ALTER TABLE "esti_kb_material_brand" ADD COLUMN IF NOT EXISTS "rate_paise" integer;
