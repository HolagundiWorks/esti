-- 0197 — SOP slice 4: site field reports (G711-style observation records).
CREATE TABLE IF NOT EXISTS esti_cons_field_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  report_no bigint NOT NULL DEFAULT 1,
  visit_date date NOT NULL,
  weather text,
  personnel text,
  work_observed text,
  observations text,
  nonconformances text,
  instructions text,
  next_visit date,
  author_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_field_report_engagement_idx
  ON esti_cons_field_report(engagement_id);
