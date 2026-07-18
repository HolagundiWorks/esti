-- Project structural deductions for auto column / wall heights.

ALTER TABLE esti_projectoffice
  ADD COLUMN IF NOT EXISTS slab_thickness_mm integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS beam_depth_mm integer NOT NULL DEFAULT 450,
  ADD COLUMN IF NOT EXISTS lintel_height_mm integer NOT NULL DEFAULT 150;

COMMENT ON COLUMN esti_projectoffice.slab_thickness_mm IS 'Typical slab thickness (mm) — deducted for column/wall clear height';
COMMENT ON COLUMN esti_projectoffice.beam_depth_mm IS 'Typical beam depth (mm) — deducted for column/wall clear height';
COMMENT ON COLUMN esti_projectoffice.lintel_height_mm IS 'Typical lintel depth (mm) — deducted for wall clear height only';
