-- 0119 — Studio › Libraries › Master Plan Library (office-wide reference files).
CREATE TABLE IF NOT EXISTS esti_master_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'PDF',
  file_key text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  version integer NOT NULL DEFAULT 1,
  notes text,
  uploaded_by_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
