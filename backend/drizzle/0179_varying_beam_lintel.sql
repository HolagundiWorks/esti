-- Per-level and per-row overrides for varying beam depths / lintels.
-- NULL = inherit from the next broader scope (row → level → project).

ALTER TABLE esti_building_level
  ADD COLUMN IF NOT EXISTS beam_depth_mm integer,
  ADD COLUMN IF NOT EXISTS lintel_height_mm integer;

ALTER TABLE esti_measurement_row
  ADD COLUMN IF NOT EXISTS beam_depth_mm integer,
  ADD COLUMN IF NOT EXISTS lintel_height_mm integer;

COMMENT ON COLUMN esti_building_level.beam_depth_mm IS 'Optional beam depth for this level (mm); NULL = project default';
COMMENT ON COLUMN esti_building_level.lintel_height_mm IS 'Optional lintel depth for this level (mm); NULL = project default';
COMMENT ON COLUMN esti_measurement_row.beam_depth_mm IS 'Optional beam depth for this row (mm); NULL = level then project';
COMMENT ON COLUMN esti_measurement_row.lintel_height_mm IS 'Optional lintel depth for this row (mm); NULL = level then project';
