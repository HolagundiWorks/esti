-- 0120 — Studio › Libraries › Standards Library (by discipline + attached files).
CREATE TABLE IF NOT EXISTS esti_standard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline text NOT NULL,
  title text NOT NULL,
  notes text,
  table_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_standard_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id uuid NOT NULL REFERENCES esti_standard(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'PDF',
  file_key text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_standard_file_standard_idx ON esti_standard_file(standard_id);
