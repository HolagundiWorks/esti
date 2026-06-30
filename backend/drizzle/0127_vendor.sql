-- Vendors: material supplier directory + pricing history
-- Mirrors the contractor register; vendor_price builds a historical rate book
-- per vendor / material (seed for the KB vendor-rate ladder).

CREATE TABLE esti_vendor (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  category           text NOT NULL,
  company_name       text,
  contact_person     text,
  gstin              text,
  pan                text,
  email              text,
  phone              text,
  city               text,
  state              text,
  active             boolean NOT NULL DEFAULT true,
  quality_rating     integer,
  reliability_rating integer,
  pricing_rating     integer,
  notes              text,
  created_by_id      uuid REFERENCES esti_user(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE esti_vendor_price (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES esti_vendor(id) ON DELETE CASCADE,
  material_id     uuid REFERENCES esti_kb_material(id) ON DELETE SET NULL,
  material_name   text NOT NULL,
  unit            text NOT NULL,
  rate_paise      integer NOT NULL DEFAULT 0,
  effective_date  date NOT NULL,
  source          text NOT NULL DEFAULT 'MANUAL',
  notes           text,
  created_by_id   uuid REFERENCES esti_user(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_vendor (category);
CREATE INDEX ON esti_vendor_price (vendor_id);
CREATE INDEX ON esti_vendor_price (material_id);
