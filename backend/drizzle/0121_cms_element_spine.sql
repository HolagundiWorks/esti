-- Cost Management System — Element-centric spine. Supersedes the line-based
-- Estimation E1 (esti_est_*, migration 0115; no production data).
DROP TABLE IF EXISTS esti_est_line CASCADE;
DROP TABLE IF EXISTS esti_est_estimate CASCADE;

CREATE TABLE IF NOT EXISTS esti_cms_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES esti_cms_location(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cms_location_project_idx ON esti_cms_location (project_id);

CREATE TABLE IF NOT EXISTS esti_cms_element (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  code text NOT NULL,
  seq integer NOT NULL DEFAULT 0,
  parent_element_id uuid REFERENCES esti_cms_element(id) ON DELETE CASCADE,
  is_component boolean NOT NULL DEFAULT false,
  dependency_type text,
  location_id uuid REFERENCES esti_cms_location(id) ON DELETE SET NULL,
  grid_ref text,
  item_id uuid REFERENCES esti_kb_item(id) ON DELETE SET NULL,
  specification_id uuid REFERENCES esti_kb_specification(id) ON DELETE SET NULL,
  description text NOT NULL,
  measurement_type text NOT NULL DEFAULT 'VOLUME',
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity double precision NOT NULL DEFAULT 0,
  unit text,
  rate_paise integer NOT NULL DEFAULT 0,
  amount_paise integer NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cms_element_project_idx ON esti_cms_element (project_id);
CREATE INDEX IF NOT EXISTS esti_cms_element_parent_idx ON esti_cms_element (parent_element_id);
CREATE UNIQUE INDEX IF NOT EXISTS esti_cms_element_code_uidx ON esti_cms_element (project_id, code);
