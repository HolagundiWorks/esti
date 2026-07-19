-- P8.7 — printable abstract sheet.
--
-- Same pdf_key/pdf_status pair every other rendered document carries, so the
-- measurement book plugs into the existing worker render pipeline (ADR-10)
-- rather than growing a second one.
ALTER TABLE esti_measurement_book
  ADD COLUMN IF NOT EXISTS pdf_key text;

ALTER TABLE esti_measurement_book
  ADD COLUMN IF NOT EXISTS pdf_status text NOT NULL DEFAULT 'NONE';
