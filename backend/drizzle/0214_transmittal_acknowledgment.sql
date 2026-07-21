-- 0214 — Transmittal acknowledgment + MDR back-reference (SOP §3).
-- Studio transmittals gain a one-way receiver acknowledgment; consultancy
-- deliverables can link the issue transmittal that carried them.
ALTER TABLE esti_transmittal
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by text,
  ADD COLUMN IF NOT EXISTS acknowledgment_note text;

ALTER TABLE esti_cons_deliverable
  ADD COLUMN IF NOT EXISTS transmittal_id uuid REFERENCES esti_transmittal(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS esti_cons_deliverable_transmittal_idx
  ON esti_cons_deliverable(transmittal_id);
