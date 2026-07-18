-- Drawing QC / peer-review checkpoint (SOP-07/08 gap: "no dedicated peer-review
-- gate before issue"). Advisory: does not block esti_drawing.issue_pdf_status,
-- just gives every drawing a reviewed/unreviewed signal before it's issued.

ALTER TABLE esti_drawing
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'PENDING_REVIEW';

ALTER TABLE esti_drawing
  ADD COLUMN IF NOT EXISTS reviewed_by_id uuid REFERENCES esti_user(id);

ALTER TABLE esti_drawing
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE esti_drawing
  ADD COLUMN IF NOT EXISTS review_note text;
