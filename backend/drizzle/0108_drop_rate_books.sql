-- Remove Rate Books (DSR) + Rate Analysis reference data.
-- The spec-catalogue's optional spec → rate-book link is dropped first, then the
-- four tables. CASCADE clears any remaining FK constraints that referenced them.
ALTER TABLE esti_spec_catalog_item DROP COLUMN IF EXISTS rate_item_id;

DROP TABLE IF EXISTS esti_rate_component CASCADE;
DROP TABLE IF EXISTS esti_rate_analysis CASCADE;
DROP TABLE IF EXISTS esti_dsr_item CASCADE;
DROP TABLE IF EXISTS esti_dsr_version CASCADE;
