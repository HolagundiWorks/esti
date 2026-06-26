-- 48-Hour Intervention Engine (§14 Task OS)
-- Tracks tasks whose dependency has been blocking for more than 48 hours.

ALTER TABLE esti_task
  ADD COLUMN intervention_required boolean NOT NULL DEFAULT false;
