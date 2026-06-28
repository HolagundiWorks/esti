-- Estimation OS — project estimates on the Knowledge Bank (fresh esti_est_* namespace).
CREATE TABLE IF NOT EXISTS esti_est_estimate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_est_estimate_project_idx
  ON esti_est_estimate (project_id);

CREATE TABLE IF NOT EXISTS esti_est_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES esti_est_estimate(id) ON DELETE CASCADE,
  item_id uuid REFERENCES esti_kb_item(id) ON DELETE SET NULL,
  specification_id uuid REFERENCES esti_kb_specification(id) ON DELETE SET NULL,
  description text NOT NULL,
  unit text,
  quantity double precision NOT NULL DEFAULT 0,
  rate_paise integer NOT NULL DEFAULT 0,
  amount_paise integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_est_line_estimate_idx
  ON esti_est_line (estimate_id);
