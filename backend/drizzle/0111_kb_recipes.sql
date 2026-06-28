-- Construction Knowledge Bank — Phase 2b: consumption recipes (spec -> material / labour).
CREATE TABLE IF NOT EXISTS esti_kb_spec_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specification_id uuid NOT NULL REFERENCES esti_kb_specification(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES esti_kb_material(id) ON DELETE CASCADE,
  quantity_per_unit double precision NOT NULL DEFAULT 0,
  wastage_factor double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_kb_spec_material_spec_idx
  ON esti_kb_spec_material (specification_id);

CREATE TABLE IF NOT EXISTS esti_kb_spec_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specification_id uuid NOT NULL REFERENCES esti_kb_specification(id) ON DELETE CASCADE,
  labor_id uuid NOT NULL REFERENCES esti_kb_labor(id) ON DELETE CASCADE,
  quantity_per_unit double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_kb_spec_labor_spec_idx
  ON esti_kb_spec_labor (specification_id);
