-- 0189 — AORMS-Consultancy Phase 2 slice 3: variations (additional services).
CREATE TABLE IF NOT EXISTS esti_cons_variation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  amount_paise bigint NOT NULL DEFAULT 0,
  source_tq_id uuid REFERENCES esti_cons_tq(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PROPOSED',
  fee_stage_id uuid REFERENCES esti_cons_fee_stage(id) ON DELETE SET NULL,
  notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_variation_engagement_idx
  ON esti_cons_variation(engagement_id);
