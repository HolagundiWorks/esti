-- 0219 — AORMS-Studio pre-construction R&O (parity with consultancy).
-- Project risk register, opportunity register, design phase gates.
-- See docs/esti/AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md.

CREATE TABLE IF NOT EXISTS esti_project_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL,
  likelihood integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  owner text,
  response text NOT NULL DEFAULT 'REDUCE',
  mitigation text,
  residual_likelihood integer,
  residual_impact integer,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_project_risk_project_idx ON esti_project_risk(project_id);
CREATE INDEX IF NOT EXISTS esti_project_risk_status_idx ON esti_project_risk(status);

CREATE TABLE IF NOT EXISTS esti_project_opportunity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  linked_risk_id uuid REFERENCES esti_project_risk(id) ON DELETE SET NULL,
  title text NOT NULL,
  source text NOT NULL DEFAULT 'WORKSHOP',
  area text NOT NULL DEFAULT 'DESIGN',
  probability integer NOT NULL DEFAULT 3,
  impact integer NOT NULL DEFAULT 3,
  response text NOT NULL DEFAULT 'ENHANCE',
  owner text,
  action_plan text,
  due_date date,
  value_note text,
  estimated_value_paise bigint,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_project_opportunity_project_idx ON esti_project_opportunity(project_id);
CREATE INDEX IF NOT EXISTS esti_project_opportunity_status_idx ON esti_project_opportunity(status);

CREATE TABLE IF NOT EXISTS esti_project_phase_gate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES esti_phase(id) ON DELETE SET NULL,
  gate_key text NOT NULL,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text NOT NULL DEFAULT 'PENDING',
  notes text,
  decided_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  decided_by_name text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_project_phase_gate_project_gate_uidx
  ON esti_project_phase_gate(project_id, gate_key);
CREATE INDEX IF NOT EXISTS esti_project_phase_gate_project_idx ON esti_project_phase_gate(project_id);
