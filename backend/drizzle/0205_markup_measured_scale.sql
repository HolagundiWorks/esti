-- P8.6 follow-up — detect markups measured at a superseded sheet scale.
--
-- Dimensions and areas are stored at draw time against the calibration then in
-- force. Re-calibrating a sheet (commonly because the first calibration was
-- wrong — a 1:100 scale bar read on a 1:50 sheet) leaves every existing markup
-- silently wrong: linear by the ratio, area by its square.
--
-- Recording the factor each markup was measured at lets the app SAY so and
-- offer an explicit re-measure, rather than either silently restating
-- quantities that may already be signed off, or silently keeping wrong ones.
ALTER TABLE esti_plan_markup_item
  ADD COLUMN IF NOT EXISTS measured_units_per_point double precision;

-- Existing rows were measured at whatever their sheet is calibrated at now;
-- assume current so they are not all reported stale on first load.
UPDATE esti_plan_markup_item i
   SET measured_units_per_point = c.units_per_point
  FROM esti_plan_markup_set s
  JOIN esti_sheet_calibration c
    ON c.drawing_id = s.drawing_id AND c.page_no = 0
 WHERE i.set_id = s.id
   AND i.measured_units_per_point IS NULL;
