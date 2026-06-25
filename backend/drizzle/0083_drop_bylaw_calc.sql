-- Phase 7 cleanup: the per-project BBMP bylaw calculator is removed from the
-- product. Drop its two calculator-only tables. The shared rule store
-- (esti_bbmp_rule_set) and the per-project bylaw-parameter table (esti_bylaw,
-- still read by the RIE site-assessment engine) are intentionally kept.
DROP TABLE IF EXISTS "esti_compliance_calculation";
DROP TABLE IF EXISTS "esti_bylaw_calc";
