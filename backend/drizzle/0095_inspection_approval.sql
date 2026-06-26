-- Inspection approval workflow: submitted_by, approved_by, rejection_note
-- status lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED → ISSUED

ALTER TABLE esti_inspection
  ADD COLUMN submitted_by_id uuid REFERENCES esti_user(id),
  ADD COLUMN approved_by_id  uuid REFERENCES esti_user(id),
  ADD COLUMN rejection_note  text;
