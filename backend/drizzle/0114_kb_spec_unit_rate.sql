-- Construction Knowledge Bank — specifications carry a unit of measurement + rate.
ALTER TABLE esti_kb_specification ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE esti_kb_specification ADD COLUMN IF NOT EXISTS rate_paise integer NOT NULL DEFAULT 0;
