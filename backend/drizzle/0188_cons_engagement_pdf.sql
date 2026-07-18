-- 0188 — AORMS-Consultancy: built-in PDF export for the engagement register.
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS pdf_status text,
  ADD COLUMN IF NOT EXISTS pdf_key text;
