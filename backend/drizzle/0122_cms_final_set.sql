-- CMS-2: Final Estimation Set — frozen cost snapshot that moves to Documents.
-- Once status = FINAL the row is immutable; each revision gets a new row.
CREATE TABLE IF NOT EXISTS esti_cms_final_set (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  revision_no integer NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_paise integer NOT NULL DEFAULT 0,
  pdf_status text NOT NULL DEFAULT 'NONE',
  pdf_key text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cms_final_set_project_idx ON esti_cms_final_set (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS esti_cms_final_set_rev_uidx ON esti_cms_final_set (project_id, revision_no);
