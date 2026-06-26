-- Priority Scoring Engine (§19 Task OS)
-- Stores the computed multi-factor priority score (0-100) for each task.

ALTER TABLE esti_task
  ADD COLUMN priority_score integer NOT NULL DEFAULT 0;
