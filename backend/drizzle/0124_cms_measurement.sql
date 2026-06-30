-- CMS-4: Site Measurement Book
-- Records of work executed at site per element. DRAFT → VERIFIED via cost:approve.

CREATE TABLE esti_cms_measurement (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  element_id    uuid NOT NULL REFERENCES esti_cms_element(id) ON DELETE CASCADE,
  date          text NOT NULL,
  description   text,
  executed_qty  double precision NOT NULL DEFAULT 0,
  measured_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  verified_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  verified_at   timestamptz,
  remarks       text,
  status        text NOT NULL DEFAULT 'DRAFT',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_cms_measurement (project_id);
CREATE INDEX ON esti_cms_measurement (element_id);
