-- Simplify phase model: status is now derived from sort_order + current_phase_id.
-- date_planned and date_actual are removed; status is removed from esti_phase.

ALTER TABLE esti_projectoffice ADD COLUMN current_phase_id uuid REFERENCES esti_phase(id);

-- Migrate: set current_phase_id = first non-complete/billed phase, else last phase.
UPDATE esti_projectoffice po SET current_phase_id = (
  SELECT ph.id FROM esti_phase ph
  WHERE ph.project_id = po.id
  ORDER BY
    CASE WHEN ph.status NOT IN ('COMPLETE', 'BILLED') THEN 0 ELSE 1 END,
    ph.sort_order ASC
  LIMIT 1
);

ALTER TABLE esti_phase
  DROP COLUMN status,
  DROP COLUMN date_planned,
  DROP COLUMN date_actual;
