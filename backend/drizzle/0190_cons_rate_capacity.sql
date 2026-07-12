-- 0190 — AORMS-Consultancy Phase 2 close: capacity per grade (utilisation denominator).
ALTER TABLE esti_cons_rate_card
  ADD COLUMN IF NOT EXISTS capacity_hours_week double precision NOT NULL DEFAULT 0;
