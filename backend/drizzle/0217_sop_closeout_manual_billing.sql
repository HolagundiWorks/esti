-- 0217 — Consultancy SOP closeout registers + P7.2 manual usage billing export.
-- Lessons, NC/CAPA, MoM, WIP review decisions, contract review checklist;
-- usage reports gain billed_* for manual India invoice export (no Stripe).

CREATE TABLE IF NOT EXISTS esti_cons_lesson (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'GENERAL',
  title text NOT NULL,
  body text NOT NULL,
  recommendation text,
  status text NOT NULL DEFAULT 'DRAFT',
  author_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_lesson_engagement_idx ON esti_cons_lesson(engagement_id);

CREATE TABLE IF NOT EXISTS esti_cons_nc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  field_report_id uuid REFERENCES esti_cons_field_report(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'MINOR',
  responsible_party text,
  corrective_action text,
  preventive_action text,
  due_date date,
  status text NOT NULL DEFAULT 'OPEN',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_cons_nc_engagement_code_uidx ON esti_cons_nc(engagement_id, code);
CREATE INDEX IF NOT EXISTS esti_cons_nc_status_idx ON esti_cons_nc(status);

CREATE TABLE IF NOT EXISTS esti_cons_mom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  ref text NOT NULL,
  title text NOT NULL,
  meeting_date date NOT NULL,
  attendees text,
  minutes text,
  status text NOT NULL DEFAULT 'DRAFT',
  author_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS esti_cons_mom_engagement_ref_uidx ON esti_cons_mom(engagement_id, ref);
CREATE INDEX IF NOT EXISTS esti_cons_mom_engagement_idx ON esti_cons_mom(engagement_id);

CREATE TABLE IF NOT EXISTS esti_cons_wip_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  wip_paise bigint NOT NULL DEFAULT 0,
  decision text NOT NULL DEFAULT 'HOLD',
  notes text,
  reviewed_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  reviewed_by_name text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_wip_review_engagement_idx ON esti_cons_wip_review(engagement_id);

CREATE TABLE IF NOT EXISTS esti_cons_contract_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  requirements_defined boolean NOT NULL DEFAULT false,
  capability_confirmed boolean NOT NULL DEFAULT false,
  conflict_checked boolean NOT NULL DEFAULT false,
  proposal_vs_contract_ok boolean NOT NULL DEFAULT false,
  decision text NOT NULL DEFAULT 'PENDING',
  notes text,
  reviewer_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_contract_review_engagement_idx ON esti_cons_contract_review(engagement_id);

-- Litigation hold flag on engagement (retention policy layer — thin).
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS litigation_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_note text;

-- P7.2 manual billing marks on platform usage reports.
ALTER TABLE hlp_usage_report
  ADD COLUMN IF NOT EXISTS billed_at timestamptz,
  ADD COLUMN IF NOT EXISTS billed_by text,
  ADD COLUMN IF NOT EXISTS billing_note text;
