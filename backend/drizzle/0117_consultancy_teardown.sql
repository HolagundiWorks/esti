-- 0117 — Consultancy-only teardown. Drops the tables behind the removed modules:
-- tenders (Phase 7 + Construction Cost OS Phase A), mood boards, the construction
-- schedule (CPM), and the office/project programme milestones. CASCADE handles FK
-- order. The dormant cost-spine tables (work packages, running bills, measurements,
-- deviations, BBS, etc.) from the prior Estimation-OS teardown are left for a later
-- dedicated cleanup.

-- Tenders (7 tables)
DROP TABLE IF EXISTS esti_tender_document_ack CASCADE;
DROP TABLE IF EXISTS esti_tender_document CASCADE;
DROP TABLE IF EXISTS esti_tender_bid_item CASCADE;
DROP TABLE IF EXISTS esti_tender_bid CASCADE;
DROP TABLE IF EXISTS esti_tender_invitation CASCADE;
DROP TABLE IF EXISTS esti_tender_item CASCADE;
DROP TABLE IF EXISTS esti_tender CASCADE;

-- Mood boards
DROP TABLE IF EXISTS esti_moodimage CASCADE;
DROP TABLE IF EXISTS esti_moodboard CASCADE;

-- Construction schedule (CPM)
DROP TABLE IF EXISTS esti_construction_dependency CASCADE;
DROP TABLE IF EXISTS esti_construction_activity CASCADE;
DROP TABLE IF EXISTS esti_construction_schedule CASCADE;

-- Programme (office/project delivery Gantt milestones)
DROP TABLE IF EXISTS esti_project_milestone CASCADE;
