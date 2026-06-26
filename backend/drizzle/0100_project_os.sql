-- Project OS (Phase 31) — lead → active-project acquisition pipeline.
-- Slices A–K. See docs/esti/PROJECT-OS-ARCHITECTURE.md. Money is integer paise.

-- Slice A — Lead Capture Engine -------------------------------------------------
CREATE TABLE esti_lead (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                   text        NOT NULL UNIQUE,
  client_name           text        NOT NULL,
  phone                 text,
  email                 text,
  lead_source           text        NOT NULL,
  project_type          text,
  site_location         text,
  city                  text,
  assigned_to_id        uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  status                text        NOT NULL DEFAULT 'NEW',
  converted_client_id   uuid        REFERENCES esti_client(id) ON DELETE SET NULL,
  converted_project_id  uuid        REFERENCES esti_projectoffice(id) ON DELETE SET NULL,
  notes                 text,
  created_by_id         uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX esti_lead_status_idx ON esti_lead(status);

-- Slice B — Project DNA Engine --------------------------------------------------
CREATE TABLE esti_project_dna (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid        NOT NULL UNIQUE REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  budget_mode           text        NOT NULL,
  vastu_requirement     text        NOT NULL,
  design_language       text        NOT NULL,
  design_flexibility    text        NOT NULL,
  decision_makers       text        NOT NULL,
  timeline_criticality  text        NOT NULL,
  material_expectation  text        NOT NULL,
  revision_tolerance    text        NOT NULL,
  custom_notes          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Slice C — Pre-Project Assessment Engine ---------------------------------------
CREATE TABLE esti_pre_project_assessment (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid        NOT NULL UNIQUE REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  site_length                 double precision,
  site_width                  double precision,
  manual_area                 double precision,
  site_area_sqm               double precision NOT NULL DEFAULT 0,
  far_factor                  double precision NOT NULL DEFAULT 0,
  permissible_far_area        double precision NOT NULL DEFAULT 0,
  front_setback               double precision NOT NULL DEFAULT 0,
  rear_setback                double precision NOT NULL DEFAULT 0,
  left_setback                double precision NOT NULL DEFAULT 0,
  right_setback               double precision NOT NULL DEFAULT 0,
  setback_buildable_area      double precision NOT NULL DEFAULT 0,
  ground_coverage_pct         double precision NOT NULL DEFAULT 0,
  coverage_area               double precision NOT NULL DEFAULT 0,
  actual_ground_coverage      double precision NOT NULL DEFAULT 0,
  possible_floors             double precision NOT NULL DEFAULT 0,
  super_builtup_factor        double precision NOT NULL DEFAULT 1.25,
  super_builtup_area          double precision NOT NULL DEFAULT 0,
  construction_rate_paise     bigint      NOT NULL DEFAULT 0,
  estimated_project_cost_paise bigint     NOT NULL DEFAULT 0,
  breakdown                   jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Slice D — Feasibility Report Engine -------------------------------------------
CREATE TABLE esti_feasibility_report (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  assessment_id uuid        REFERENCES esti_pre_project_assessment(id) ON DELETE SET NULL,
  snapshot      jsonb       NOT NULL DEFAULT '{}',
  generated_at  timestamptz,
  share_token   text        NOT NULL UNIQUE,
  pdf_key       text,
  pdf_status    text        NOT NULL DEFAULT 'NONE',
  created_by_id uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX esti_feasibility_report_project_idx ON esti_feasibility_report(project_id);

-- Slice H — Negotiation Engine --------------------------------------------------
CREATE TABLE esti_project_negotiation (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid          NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  fee_proposal_id        uuid,
  round_no               integer       NOT NULL DEFAULT 1,
  fee_change_paise       bigint        NOT NULL DEFAULT 0,
  scope_changes          text,
  timeline_changes       text,
  discount_requested_pct numeric(5,2)  NOT NULL DEFAULT 0,
  architect_response     text,
  client_response        text,
  outcome                text          NOT NULL DEFAULT 'ONGOING',
  conversion_probability integer       NOT NULL DEFAULT 0,
  created_by_id          uuid          REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at             timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX esti_project_negotiation_project_idx ON esti_project_negotiation(project_id);

-- Slice J — Client Onboarding Engine --------------------------------------------
CREATE TABLE esti_client_onboarding (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid        NOT NULL UNIQUE REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  billing_address          text,
  gstin                    text,
  pan                      text,
  authorized_reps          jsonb       NOT NULL DEFAULT '[]',
  communication_preference text,
  agreement_doc_key        text,
  id_doc_key               text,
  status                   text        NOT NULL DEFAULT 'PENDING',
  completed_at             timestamptz,
  completed_by_id          uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Slice G — Draft project pipeline links (on esti_projectoffice) -----------------
ALTER TABLE esti_projectoffice ADD COLUMN lead_id       uuid REFERENCES esti_lead(id) ON DELETE SET NULL;
ALTER TABLE esti_projectoffice ADD COLUMN dna_id        uuid REFERENCES esti_project_dna(id) ON DELETE SET NULL;
ALTER TABLE esti_projectoffice ADD COLUMN assessment_id uuid REFERENCES esti_pre_project_assessment(id) ON DELETE SET NULL;

-- Slice F — Client Discussion Layer (on esti_clientlog) --------------------------
ALTER TABLE esti_clientlog ADD COLUMN outcome            text;
ALTER TABLE esti_clientlog ADD COLUMN budget_objections  text;
ALTER TABLE esti_clientlog ADD COLUMN architect_comments text;

-- Slice I — Client Approval Gate (on esti_feeproposal) --------------------------
ALTER TABLE esti_feeproposal ADD COLUMN client_approval_status text NOT NULL DEFAULT 'PENDING';
ALTER TABLE esti_feeproposal ADD COLUMN client_approved_at     timestamptz;
ALTER TABLE esti_feeproposal ADD COLUMN approval_notes         text;

-- Slice K — Advance Payment Gate (on esti_invoice) ------------------------------
ALTER TABLE esti_invoice ADD COLUMN is_advance boolean NOT NULL DEFAULT false;
