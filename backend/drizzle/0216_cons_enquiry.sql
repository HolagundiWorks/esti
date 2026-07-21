-- 0216 — Consultancy enquiry register + go/no-go (SOP §2 intake).
-- Pre-engagement pipeline: RECEIVED → UNDER_REVIEW → GO/NO_GO → WON (job) / LOST.
CREATE TABLE IF NOT EXISTS esti_cons_enquiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  title text NOT NULL,
  client_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  source text,
  site_location text,
  consultancy_type text,
  lead_discipline text NOT NULL,
  model text,
  status text NOT NULL DEFAULT 'RECEIVED',
  -- Go/no-go scorecard (1–5). Null until scored.
  capacity_fit integer,
  fee_attractiveness integer,
  risk integer,
  strategic_fit integer,
  conflict_check_done boolean NOT NULL DEFAULT false,
  decision_note text,
  decided_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  decided_by_name text,
  decided_at timestamptz,
  converted_engagement_id uuid REFERENCES esti_cons_engagement(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_enquiry_status_idx ON esti_cons_enquiry(status);
CREATE INDEX IF NOT EXISTS esti_cons_enquiry_created_idx ON esti_cons_enquiry(created_at DESC);
