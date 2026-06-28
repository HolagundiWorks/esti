-- 0116 — Unify Proposals: merge the thin esti_proposal (scope/agreement) into the
-- COA fee-proposal model, then rename the survivor to esti_proposal. The thin table
-- has no inbound FKs; esti_feeproposal is FK'd by esti_appointment.fee_proposal_id,
-- which follows the table rename automatically.

-- 1. Extend the fee-proposal model with the thin proposal's fields.
ALTER TABLE esti_feeproposal
  ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'ARCHITECTURE',
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Migrate thin proposal rows in (no COA category → NON_HOUSING; refs don't
--    collide: PRP/… vs FEE/…).
INSERT INTO esti_feeproposal
  (ref, project_id, work_category, work_type, cost_of_works_paise, fee_paise,
   doc_comm_pct, coa_minimum_paise, below_minimum, scope, notes, status,
   pdf_key, pdf_status, client_approval_status, created_at, updated_at)
SELECT
  ref, project_id, 'NON_HOUSING', work_type, 0, fee_paise,
  10, 0, false, scope, notes, status,
  pdf_key, pdf_status, 'PENDING', created_at, updated_at
FROM esti_proposal;

-- 3. Drop the thin table and promote the survivor to the canonical name.
DROP TABLE esti_proposal;
ALTER TABLE esti_feeproposal RENAME TO esti_proposal;
