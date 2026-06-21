-- Extend portal submissions with change-request impact assessment fields
ALTER TABLE esti_portal_submission
  ADD COLUMN IF NOT EXISTS attention_to_id  uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ref_drawing_id   uuid REFERENCES esti_drawing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affects_costing  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS affects_timeline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_billable      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS architect_comment text;
