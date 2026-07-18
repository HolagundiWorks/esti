-- 0187 — AORMS-Consultancy Phase 2 slice 2: rate cards + timesheets.
CREATE TABLE IF NOT EXISTS esti_cons_rate_card (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  rate_paise bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_cons_rate_card_grade_idx
  ON esti_cons_rate_card(grade);

CREATE TABLE IF NOT EXISTS esti_cons_timesheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES esti_cons_deliverable(id) ON DELETE SET NULL,
  user_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  date date NOT NULL,
  grade text NOT NULL,
  hours double precision NOT NULL,
  value_paise bigint NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_timesheet_engagement_idx
  ON esti_cons_timesheet(engagement_id);
