-- Building levels: LVL index (0–10) + FFL-to-FFL storey height.

ALTER TABLE esti_building_level
  ADD COLUMN IF NOT EXISTS level_index integer,
  ADD COLUMN IF NOT EXISTS storey_height_mm integer NOT NULL DEFAULT 3000;

-- Backfill level_index from sort order for any existing rows.
UPDATE esti_building_level bl
SET level_index = sub.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY sort_order, code) - 1) AS rn
  FROM esti_building_level
) sub
WHERE bl.id = sub.id AND bl.level_index IS NULL;

UPDATE esti_building_level SET level_index = 0 WHERE level_index IS NULL;

ALTER TABLE esti_building_level
  ALTER COLUMN level_index SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS esti_building_level_project_idx_uq
  ON esti_building_level(project_id, level_index);

COMMENT ON COLUMN esti_building_level.level_index IS 'Canonical stack index LVL 0 … LVL 10';
COMMENT ON COLUMN esti_building_level.storey_height_mm IS 'FFL of this level to FFL of next level (mm)';
COMMENT ON COLUMN esti_building_level.elevation_mm IS 'Absolute FFL elevation from LVL 0 datum (mm)';
COMMENT ON COLUMN esti_building_level.code IS 'Canonical code e.g. LVL 0';
COMMENT ON COLUMN esti_building_level.name IS 'User floor name e.g. Basement, Ground, Stilt';
