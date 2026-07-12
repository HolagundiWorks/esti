-- 0184 — AORMS-Consultancy Phase 1 "Reliance engine": sign-off chain + TQ register.
ALTER TABLE esti_cons_deliverable
  ADD COLUMN IF NOT EXISTS originated_by uuid REFERENCES esti_user(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS esti_cons_review_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES esti_cons_deliverable(id) ON DELETE CASCADE,
  kind text NOT NULL,
  user_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_cons_review_step_deliverable_idx
  ON esti_cons_review_step(deliverable_id);

CREATE TABLE IF NOT EXISTS esti_cons_tq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  code text NOT NULL,
  question text NOT NULL,
  scope_impact boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'OPEN',
  answer text,
  closure_note text,
  raised_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  answered_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_cons_tq_engagement_idx ON esti_cons_tq(engagement_id);
