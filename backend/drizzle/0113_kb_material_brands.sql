-- Construction Knowledge Bank — Phase 3b: material → brand mapping.
CREATE TABLE IF NOT EXISTS esti_kb_material_brand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES esti_kb_material(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES esti_kb_brand(id) ON DELETE CASCADE,
  grade_or_variant text,
  quality_level text,
  preferred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_kb_material_brand_material_idx
  ON esti_kb_material_brand (material_id);
