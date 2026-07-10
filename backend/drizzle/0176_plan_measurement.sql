-- Plan measurement spine: items library, measurement book, building levels, plan markup (Phase 2 tables).

CREATE TABLE IF NOT EXISTS esti_item_library_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_item_library_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES esti_item_library_version(id) ON DELETE CASCADE,
  code text NOT NULL,
  chapter text NOT NULL,
  particulars text NOT NULL,
  uom text NOT NULL,
  measure_kind text NOT NULL,
  marker_kinds jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_breadth_mm integer,
  default_height_from text NOT NULL DEFAULT 'MANUAL',
  spec_catalog_item_id uuid REFERENCES esti_spec_catalog_item(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_item_library_item_version_idx ON esti_item_library_item(version_id);
CREATE UNIQUE INDEX IF NOT EXISTS esti_item_library_item_code_version_idx ON esti_item_library_item(version_id, code);

CREATE TABLE IF NOT EXISTS esti_building_level (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  elevation_mm integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_building_level_project_idx ON esti_building_level(project_id);

CREATE TABLE IF NOT EXISTS esti_measurement_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Measurement sheet',
  status text NOT NULL DEFAULT 'DRAFT',
  library_version_id uuid REFERENCES esti_item_library_version(id),
  revision_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_measurement_book_project_idx ON esti_measurement_book(project_id);

CREATE TABLE IF NOT EXISTS esti_measurement_row (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES esti_measurement_book(id) ON DELETE CASCADE,
  level_id uuid REFERENCES esti_building_level(id),
  library_item_id uuid REFERENCES esti_item_library_item(id),
  library_item_code text,
  particulars text NOT NULL,
  length_mm integer,
  breadth_mm integer,
  height_mm integer,
  quantity double precision NOT NULL DEFAULT 0,
  uom text NOT NULL,
  rate_paise bigint,
  derivation text NOT NULL DEFAULT 'MANUAL',
  spec_catalog_item_id uuid REFERENCES esti_spec_catalog_item(id),
  source_markup_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_measurement_row_book_idx ON esti_measurement_row(book_id);

CREATE TABLE IF NOT EXISTS esti_sheet_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id uuid NOT NULL REFERENCES esti_drawing(id) ON DELETE CASCADE,
  page_no integer NOT NULL DEFAULT 0,
  units_per_point double precision NOT NULL,
  unit_label text NOT NULL DEFAULT 'mm',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_plan_markup_set (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id uuid NOT NULL REFERENCES esti_drawing(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Markup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_plan_markup_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES esti_plan_markup_set(id) ON DELETE CASCADE,
  marker_kind text NOT NULL,
  library_item_id uuid REFERENCES esti_item_library_item(id),
  label text NOT NULL,
  geometry jsonb NOT NULL,
  length_mm integer,
  breadth_mm integer,
  height_mm integer,
  count integer NOT NULL DEFAULT 1,
  measurement_row_id uuid REFERENCES esti_measurement_row(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default library version + starter items (CPWD-style chapters).
INSERT INTO esti_item_library_version (label, active, published_at)
VALUES ('Standard items v1', true, now())
ON CONFLICT (label) DO NOTHING;

INSERT INTO esti_item_library_item (version_id, code, chapter, particulars, uom, measure_kind, marker_kinds, default_breadth_mm, sort_order)
SELECT v.id, x.code, x.chapter, x.particulars, x.uom, x.measure_kind, x.marker_kinds::jsonb, x.default_breadth_mm, x.sort_order
FROM esti_item_library_version v
CROSS JOIN (VALUES
  ('M01', 'Masonry', 'Brick masonry in cement mortar 1:6 — 230 mm thick', 'CUM', 'LBH', '["WALL"]', 230, 10),
  ('M02', 'Masonry', 'Brick masonry in cement mortar 1:6 — 115 mm thick', 'CUM', 'LBH', '["WALL"]', 115, 20),
  ('P01', 'Plaster', 'Cement plaster 12 mm thick — internal', 'SQM', 'LB', '["WALL"]', NULL, 30),
  ('P02', 'Plaster', 'Cement plaster 20 mm thick — external', 'SQM', 'LB', '["WALL"]', NULL, 40),
  ('D01', 'Doors', 'Door frame — hardwood', 'NOS', 'COUNT', '["DOOR"]', NULL, 50),
  ('W01', 'Windows', 'Window — aluminium section with glazing', 'SQM', 'LB', '["WINDOW"]', NULL, 60),
  ('R01', 'RCC', 'RCC slab — M20 grade', 'CUM', 'LBH', '[]', NULL, 70),
  ('F01', 'Flooring', 'Vitrified tile flooring', 'SQM', 'LB', '[]', NULL, 80)
) AS x(code, chapter, particulars, uom, measure_kind, marker_kinds, default_breadth_mm, sort_order)
WHERE v.label = 'Standard items v1'
  AND NOT EXISTS (
    SELECT 1 FROM esti_item_library_item i WHERE i.version_id = v.id AND i.code = x.code
  );
