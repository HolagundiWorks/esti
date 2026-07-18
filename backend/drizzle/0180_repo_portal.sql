-- 0180 — Repo portal: EmOI-processed textbook library for ESTI RAG.
CREATE TABLE IF NOT EXISTS esti_repo_source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  category text,
  raw_text text,
  file_key text,
  file_name text,
  executive_summary text,
  status text NOT NULL DEFAULT 'DRAFT',
  process_error text,
  processed_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_repo_section (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES esti_repo_source(id) ON DELETE CASCADE,
  seq int NOT NULL DEFAULT 0,
  title text NOT NULL,
  summary text NOT NULL,
  rephrased text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_repo_source_status_idx ON esti_repo_source(status);
CREATE INDEX IF NOT EXISTS esti_repo_section_source_idx ON esti_repo_section(source_id, seq);
