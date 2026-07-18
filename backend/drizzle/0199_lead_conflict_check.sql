-- Conflict-of-interest check on lead conversion (SOP-01/02/26, COA Regulations 1989):
-- confirm no other architect already holds this commission before it becomes a project.

ALTER TABLE esti_lead
  ADD COLUMN IF NOT EXISTS conflict_check_done boolean NOT NULL DEFAULT false;

ALTER TABLE esti_lead
  ADD COLUMN IF NOT EXISTS conflict_check_notes text;
