-- Estimation OS + Construction Cost spine teardown (2026-06-28).
-- Drops every estimation/BOQ + cost-spine table. CASCADE clears the inter-table
-- FKs (the cluster is self-contained: no kept table references these). Rate Books
-- (esti_dsr_*), Rate Analysis (esti_rate_*), PMC site delivery (esti_snag /
-- esti_site_instruction / esti_progress_report / esti_phase_progress), contractor
-- directory + submissions, transmittals, approvals, drawings, and the spec
-- catalogue are all kept and intentionally NOT dropped.

-- Estimation core (esti_component / RuleSet + estimate join + IFC)
DROP TABLE IF EXISTS esti_estimate_version CASCADE;
DROP TABLE IF EXISTS esti_estimate_component CASCADE;
DROP TABLE IF EXISTS esti_component_related CASCADE;
DROP TABLE IF EXISTS esti_ifc_mapping CASCADE;
DROP TABLE IF EXISTS esti_component CASCADE;

-- Estimates / BOQ + BBS (were in knowledge-compliance schema)
DROP TABLE IF EXISTS esti_estimate_item CASCADE;
DROP TABLE IF EXISTS esti_estimate CASCADE;
DROP TABLE IF EXISTS esti_bbs_item CASCADE;
DROP TABLE IF EXISTS esti_bbs CASCADE;

-- Takeoff / drawing measurements (ESTICAD takeoff pipeline)
DROP TABLE IF EXISTS esti_measurement CASCADE;

-- Tendering (item-wise tenders + bids + documents)
DROP TABLE IF EXISTS esti_tender_document_ack CASCADE;
DROP TABLE IF EXISTS esti_tender_document CASCADE;
DROP TABLE IF EXISTS esti_tender_bid_item CASCADE;
DROP TABLE IF EXISTS esti_tender_bid CASCADE;
DROP TABLE IF EXISTS esti_tender_invitation CASCADE;
DROP TABLE IF EXISTS esti_tender_item CASCADE;
DROP TABLE IF EXISTS esti_tender CASCADE;

-- Work packages + running bills + site measurement book
DROP TABLE IF EXISTS esti_running_bill_item CASCADE;
DROP TABLE IF EXISTS esti_running_bill CASCADE;
DROP TABLE IF EXISTS esti_measurement_record CASCADE;
DROP TABLE IF EXISTS esti_work_package_item CASCADE;
DROP TABLE IF EXISTS esti_work_package CASCADE;

-- Controls: deviations + variation orders
DROP TABLE IF EXISTS esti_variation_item CASCADE;
DROP TABLE IF EXISTS esti_variation CASCADE;
DROP TABLE IF EXISTS esti_deviation CASCADE;

-- Steel reconciliation + final account + GRN + cost report
DROP TABLE IF EXISTS esti_steel_reconciliation_item CASCADE;
DROP TABLE IF EXISTS esti_steel_reconciliation CASCADE;
DROP TABLE IF EXISTS esti_final_account CASCADE;
DROP TABLE IF EXISTS esti_grn_item CASCADE;
DROP TABLE IF EXISTS esti_grn CASCADE;
DROP TABLE IF EXISTS esti_cost_report CASCADE;
