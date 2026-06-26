-- Site Visit Validation Engine (§11 Task OS)
-- Tracks planned site visits; contractor + supervisor confirm availability;
-- auto-cancel if past auto_cancel_after date and not confirmed.

CREATE TABLE esti_site_visit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  supervisor_user_id uuid REFERENCES esti_user(id),
  contractor_id uuid REFERENCES esti_contractor(id),
  supervisor_confirmed_at timestamptz,
  contractor_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'PLANNED',
  notes text,
  cancel_reason text,
  auto_cancel_after date,
  created_by_id uuid REFERENCES esti_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
