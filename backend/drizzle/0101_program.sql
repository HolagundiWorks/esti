-- Project OS — Program Formulation.
-- The architectural space schedule, formulated within the feasibility envelope
-- (esti_pre_project_assessment.super_builtup_area = max built extent, source of
-- truth). Versioned DRAFT → FROZEN; a frozen version is the revision baseline.

CREATE TABLE esti_program (
  id                 uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid             NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  version            integer          NOT NULL DEFAULT 1,
  status             text             NOT NULL DEFAULT 'DRAFT',
  assessment_id      uuid             REFERENCES esti_pre_project_assessment(id) ON DELETE SET NULL,
  max_built_area_sqm double precision NOT NULL DEFAULT 0,
  notes              text,
  frozen_at          timestamptz,
  frozen_by_id       uuid             REFERENCES esti_user(id) ON DELETE SET NULL,
  created_by_id      uuid             REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at         timestamptz      NOT NULL DEFAULT now(),
  updated_at         timestamptz      NOT NULL DEFAULT now()
);
CREATE INDEX esti_program_project_idx ON esti_program(project_id);

CREATE TABLE esti_program_space (
  id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid             NOT NULL REFERENCES esti_program(id) ON DELETE CASCADE,
  name          text             NOT NULL,
  category      text             NOT NULL,
  floor_level   integer          NOT NULL DEFAULT 0,
  unit_area_sqm double precision NOT NULL DEFAULT 0,
  count         integer          NOT NULL DEFAULT 1,
  notes         text,
  sort_order    integer          NOT NULL DEFAULT 0,
  created_at    timestamptz      NOT NULL DEFAULT now()
);
CREATE INDEX esti_program_space_program_idx ON esti_program_space(program_id);

-- Revision baseline hook: a CRIF decision can be tied to a frozen program version.
ALTER TABLE esti_decision ADD COLUMN program_version_id uuid REFERENCES esti_program(id) ON DELETE SET NULL;
