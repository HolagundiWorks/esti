-- ESTICAD companion measurement fields (Phase 13B).
ALTER TABLE esti_measurement ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'WEB';
ALTER TABLE esti_measurement ADD COLUMN IF NOT EXISTS world_geometry jsonb;
ALTER TABLE esti_measurement ADD COLUMN IF NOT EXISTS entity_refs jsonb;
ALTER TABLE esti_measurement ADD COLUMN IF NOT EXISTS scale_world_units text;
ALTER TABLE esti_measurement ADD COLUMN IF NOT EXISTS created_by_client text;
