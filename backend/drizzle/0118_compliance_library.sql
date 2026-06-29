-- 0118 — Studio › Libraries › Compliance Library (structured per-area tables).

CREATE TABLE IF NOT EXISTS esti_compliance_far (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  plot_type text,
  plot_area_min_sqm double precision,
  plot_area_max_sqm double precision,
  far double precision NOT NULL DEFAULT 0,
  ground_coverage_pct integer,
  max_height_m double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_compliance_setback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  plot_type text,
  frontage_min_m double precision,
  frontage_max_m double precision,
  front_m double precision,
  rear_m double precision,
  side1_m double precision,
  side2_m double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_compliance_nbc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause text NOT NULL,
  title text NOT NULL,
  requirement text,
  applicability text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_compliance_fire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_type text NOT NULL,
  height_band_m text,
  requirement text,
  refuge_area text,
  staircase_width_m double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_compliance_regulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority text NOT NULL,
  ref_no text,
  title text NOT NULL,
  summary text,
  link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
