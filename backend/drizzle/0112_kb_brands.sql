-- Construction Knowledge Bank — Phase 3a: brand library (manufacturers).
CREATE TABLE IF NOT EXISTS esti_kb_brand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  website text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
