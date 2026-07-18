-- 0195 — SOP slice 2: timesheet approval + invoice/paid lifecycle on fee stages.
ALTER TABLE esti_cons_timesheet
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE esti_cons_fee_stage
  ADD COLUMN IF NOT EXISTS invoice_due date,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
