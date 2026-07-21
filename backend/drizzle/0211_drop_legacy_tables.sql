-- Deliberate cleanup of tables and columns left behind by earlier teardowns.
--
-- 1. Construction Cost spine + legacy takeoff. The Estimation OS, tenders and
--    full construction-cost spine were removed in the consultancy-only pivot
--    (migration 0106), but their Drizzle definitions lingered in the schema.
--    Those definitions are now deleted; these DROPs make the DB match on any
--    install that predates or missed the original teardown (all idempotent).
DROP TABLE IF EXISTS esti_grn_item CASCADE;
DROP TABLE IF EXISTS esti_grn CASCADE;
DROP TABLE IF EXISTS esti_cost_report CASCADE;
DROP TABLE IF EXISTS esti_final_account CASCADE;
DROP TABLE IF EXISTS esti_steel_reconciliation_item CASCADE;
DROP TABLE IF EXISTS esti_steel_reconciliation CASCADE;
DROP TABLE IF EXISTS esti_variation_item CASCADE;
DROP TABLE IF EXISTS esti_variation CASCADE;
DROP TABLE IF EXISTS esti_deviation CASCADE;
DROP TABLE IF EXISTS esti_measurement_record CASCADE;
DROP TABLE IF EXISTS esti_running_bill_item CASCADE;
DROP TABLE IF EXISTS esti_running_bill CASCADE;
DROP TABLE IF EXISTS esti_work_package_item CASCADE;
DROP TABLE IF EXISTS esti_work_package CASCADE;
DROP TABLE IF EXISTS esti_measurement CASCADE;

-- 2. Orphan daily-update table (superseded by tasks + activity; no reader).
DROP TABLE IF EXISTS esti_daily_update CASCADE;

-- 3. ESTICAD device-session table (desktop companion dropped 2026-07-19).
DROP TABLE IF EXISTS esti_device_session CASCADE;

-- 4. Community-edition backup recovery code (recoverWithBackupCode removed
--    2026-07-20; column has been all-NULL since).
ALTER TABLE esti_user DROP COLUMN IF EXISTS backup_code_hash;
