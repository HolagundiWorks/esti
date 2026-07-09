-- Estimation / CMS / KB estimation spine teardown (2026-07).
-- Preserves esti_spec_catalog_* (finish catalogue). Run after stopping traffic.

-- CMS bills & work orders
DROP TABLE IF EXISTS esti_cms_bill_line CASCADE;
DROP TABLE IF EXISTS esti_cms_bill CASCADE;
DROP TABLE IF EXISTS esti_cms_wo_item CASCADE;
DROP TABLE IF EXISTS esti_cms_work_order CASCADE;
DROP TABLE IF EXISTS esti_cms_measurement CASCADE;
DROP TABLE IF EXISTS esti_cms_estimation_workflow CASCADE;
DROP TABLE IF EXISTS esti_cms_element CASCADE;
DROP TABLE IF EXISTS esti_cms_final_set CASCADE;
DROP TABLE IF EXISTS esti_cms_location CASCADE;

-- KB estimation libraries
DROP TABLE IF EXISTS esti_kb_spec_material CASCADE;
DROP TABLE IF EXISTS esti_kb_spec_labor CASCADE;
DROP TABLE IF EXISTS esti_kb_item_dependency CASCADE;
DROP TABLE IF EXISTS esti_kb_material_brand CASCADE;
DROP TABLE IF EXISTS esti_kb_specification CASCADE;
DROP TABLE IF EXISTS esti_kb_alchemy_file CASCADE;
DROP TABLE IF EXISTS esti_kb_item CASCADE;
DROP TABLE IF EXISTS esti_kb_material CASCADE;
DROP TABLE IF EXISTS esti_kb_labor CASCADE;
DROP TABLE IF EXISTS esti_kb_brand CASCADE;

-- Rate book, estimates, project rates
DROP TABLE IF EXISTS esti_project_rate CASCADE;
DROP TABLE IF EXISTS esti_estimate CASCADE;
DROP TABLE IF EXISTS esti_rate_book CASCADE;

-- DSR-linked procurement standards (not spec catalog)
DROP TABLE IF EXISTS esti_specification_standard CASCADE;

-- Vendor KB material FK columns
ALTER TABLE esti_vendor_quote_line DROP COLUMN IF EXISTS material_id;
ALTER TABLE esti_vendor_price DROP COLUMN IF EXISTS material_id;

-- Orphan steel reconciliation (legacy construction cost)
DROP TABLE IF EXISTS esti_steel_reconciliation_item CASCADE;
DROP TABLE IF EXISTS esti_steel_reconciliation CASCADE;
