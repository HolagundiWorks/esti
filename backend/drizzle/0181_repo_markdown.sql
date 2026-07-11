-- 0181 — Repo portal: canonical markdown ingest (HCW Markdown Tool pipeline).
ALTER TABLE esti_repo_source
  ADD COLUMN IF NOT EXISTS markdown_text text,
  ADD COLUMN IF NOT EXISTS convert_status text,
  ADD COLUMN IF NOT EXISTS convert_error text;
