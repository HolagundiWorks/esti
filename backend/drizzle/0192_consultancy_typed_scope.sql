-- 0192 — Typed consultancy patterns: consultancy_type on engagements + the
-- per-engagement phase/scope table seeded from the type's template.
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS consultancy_type text;

CREATE TABLE IF NOT EXISTS esti_cons_engagement_phase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  seq bigint NOT NULL DEFAULT 0,
  name text NOT NULL,
  scope jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_phase_engagement_idx
  ON esti_cons_engagement_phase(engagement_id);
