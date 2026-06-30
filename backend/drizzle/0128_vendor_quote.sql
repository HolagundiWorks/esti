-- Vendor quotations: quote document (header) + line items.
-- Accepting a quote flows its lines into esti_vendor_price (pricing history).

CREATE TABLE esti_vendor_quote (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES esti_vendor(id) ON DELETE CASCADE,
  ref             text NOT NULL,
  quote_date      date NOT NULL,
  valid_until     date,
  status          text NOT NULL DEFAULT 'RECEIVED',
  notes           text,
  created_by_id   uuid REFERENCES esti_user(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE esti_vendor_quote_line (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL REFERENCES esti_vendor_quote(id) ON DELETE CASCADE,
  material_id     uuid REFERENCES esti_kb_material(id) ON DELETE SET NULL,
  material_name   text NOT NULL,
  unit            text NOT NULL,
  rate_paise      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_vendor_quote (vendor_id);
CREATE INDEX ON esti_vendor_quote_line (quote_id);
CREATE INDEX ON esti_vendor_quote_line (material_name);
