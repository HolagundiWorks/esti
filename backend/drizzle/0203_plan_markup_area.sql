-- P8.6 — plan-area takeoff.
--
-- Enclosed area of an AREA markup, in mm². Stored rather than recomputed at
-- derive time because it depends on the sheet calibration that was in force
-- when the shape was drawn; re-deriving later against a re-calibrated sheet
-- would silently restate quantities that were already signed off.
--
-- double precision, not integer: a 30 m x 20 m slab is 6e11 mm², beyond int4.
ALTER TABLE esti_plan_markup_item
  ADD COLUMN IF NOT EXISTS area_mm2 double precision;
