-- 0183 — AORMS-Consultancy Phase 0 "Living record": engagements + deliverable register.
-- esti_engagement is Studio's architect↔consultant collaboration table; the
-- engineering-consultancy spine uses esti_cons_*.
CREATE TABLE IF NOT EXISTS esti_cons_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid REFERENCES esti_client(id) ON DELETE SET NULL,
  project_id uuid REFERENCES esti_projectoffice(id) ON DELETE SET NULL,
  model text NOT NULL,
  lead_discipline text NOT NULL,
  disciplines jsonb,
  reliance_scope text,
  stage text,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_cons_deliverable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  discipline text NOT NULL,
  revision text NOT NULL DEFAULT 'A',
  issue_class text NOT NULL DEFAULT 'FOR_INFORMATION',
  check_category text NOT NULL DEFAULT 'CAT1',
  status text NOT NULL DEFAULT 'DRAFT',
  issued_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_cons_deliverable_engagement_idx
  ON esti_cons_deliverable(engagement_id);
CREATE INDEX IF NOT EXISTS esti_cons_engagement_status_idx
  ON esti_cons_engagement(status);
