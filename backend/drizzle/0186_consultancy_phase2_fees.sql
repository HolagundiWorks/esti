-- 0186 — AORMS-Consultancy Phase 2 slice 1: fee model + stages (paise).
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS fee_model text,
  ADD COLUMN IF NOT EXISTS fee_total_paise bigint;

CREATE TABLE IF NOT EXISTS esti_cons_fee_stage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount_paise bigint NOT NULL DEFAULT 0,
  deliverable_id uuid REFERENCES esti_cons_deliverable(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDING',
  billable_at timestamptz,
  invoiced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_cons_fee_stage_engagement_idx
  ON esti_cons_fee_stage(engagement_id);
