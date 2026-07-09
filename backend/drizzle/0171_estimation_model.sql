-- Estimation modelling: structure classes, BBS mapping, dependency links, workflow gate.

ALTER TABLE esti_cms_location
  ADD COLUMN IF NOT EXISTS structure_class text;

ALTER TABLE esti_cms_element
  ADD COLUMN IF NOT EXISTS structure_class text,
  ADD COLUMN IF NOT EXISTS bbs_element text,
  ADD COLUMN IF NOT EXISTS bbs_params jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS depends_on_element_id uuid REFERENCES esti_cms_element(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS esti_cms_estimation_workflow (
  project_id uuid PRIMARY KEY REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  model_complete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
