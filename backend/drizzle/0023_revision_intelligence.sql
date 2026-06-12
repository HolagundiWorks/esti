-- Phase 4C: Revision Intelligence + CRIF enhancements
-- revisionSource on decisions (CLIENT_DRIVEN / INTERNAL_ERROR / TECHNICAL_QUERY / SCOPE_CHANGE)
-- revisionBudget on phases (number of revisions included in contract fee)

ALTER TABLE esti_decision ADD COLUMN IF NOT EXISTS revision_source text;
ALTER TABLE esti_phase    ADD COLUMN IF NOT EXISTS revision_budget integer;
