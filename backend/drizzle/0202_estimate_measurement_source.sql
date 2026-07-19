-- Browser takeoff → estimate bridge (2026-07-19, ESTICAD replacement).
--
-- Links an estimate measurement line back to the measurement-book row it was
-- imported from, so re-importing updates in place instead of duplicating and
-- the abstract sheet keeps its provenance back to the marked-up plan.
ALTER TABLE esti_estimate_measurement
  ADD COLUMN IF NOT EXISTS source_measurement_row_id uuid REFERENCES esti_measurement_row(id) ON DELETE SET NULL;

-- One imported line per (estimate item, measurement row) — makes the import idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS esti_estimate_measurement_source_row_idx
  ON esti_estimate_measurement (estimate_item_id, source_measurement_row_id)
  WHERE source_measurement_row_id IS NOT NULL;
