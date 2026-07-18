-- 0191 — AORMS-Consultancy Phase 3 "Defensibility": risk register, PI policy,
-- reliance letters, and the EmOI input gate (hold point on unvalidated packs).
CREATE TABLE IF NOT EXISTS esti_cons_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  title text NOT NULL,
  likelihood bigint NOT NULL DEFAULT 3,
  impact bigint NOT NULL DEFAULT 3,
  owner text,
  response text NOT NULL DEFAULT 'REDUCE',
  mitigation text,
  residual_likelihood bigint,
  residual_impact bigint,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_risk_engagement_idx ON esti_cons_risk(engagement_id);

CREATE TABLE IF NOT EXISTS esti_cons_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer text NOT NULL,
  policy_no text NOT NULL,
  limit_paise bigint NOT NULL DEFAULT 0,
  period_from date NOT NULL,
  period_to date NOT NULL,
  run_off_until date,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_cons_reliance_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  beneficiary text NOT NULL,
  purpose text NOT NULL,
  issued_on date NOT NULL,
  expires_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_reliance_engagement_idx
  ON esti_cons_reliance_letter(engagement_id);

CREATE TABLE IF NOT EXISTS esti_cons_input_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'ARCHITECT_PACK',
  source text,
  status text NOT NULL DEFAULT 'RECEIVED',
  validated_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  validated_by_name text,
  validated_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_input_pack_engagement_idx
  ON esti_cons_input_pack(engagement_id);
