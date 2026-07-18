-- Fix: remaining Phase-1 tables after 0176 used wrong project FK name.

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
