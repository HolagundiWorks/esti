-- Estimation (Rate Books + BOQ Estimates) — consultancy-scoped costing.
-- Ported from Construction-Billing-System's domain model. No Contracts/
-- Running-Bills/BBS (AORMS is consultancy-only).

CREATE TABLE IF NOT EXISTS esti_rate_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version_label text,
  effective_date date,
  description text,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_rate_book_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_book_id uuid NOT NULL REFERENCES esti_rate_book(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  item_code text,
  description text NOT NULL,
  specification text,
  unit text NOT NULL,
  rate_paise bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_estimate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES esti_projectoffice(id),
  rate_book_id uuid NOT NULL REFERENCES esti_rate_book(id),
  title text NOT NULL,
  date date,
  status text NOT NULL DEFAULT 'DRAFT',
  contingency_pct double precision NOT NULL DEFAULT 0,
  gst_pct double precision NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_estimate_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES esti_estimate(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  rate_book_item_id uuid REFERENCES esti_rate_book_item(id),
  item_code text,
  description text NOT NULL,
  unit text NOT NULL,
  quantity double precision NOT NULL DEFAULT 0,
  rate_paise bigint NOT NULL DEFAULT 0,
  amount_paise bigint NOT NULL DEFAULT 0,
  linked_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esti_estimate_measurement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_item_id uuid NOT NULL REFERENCES esti_estimate_item(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  nos double precision NOT NULL DEFAULT 1,
  length double precision NOT NULL DEFAULT 0,
  breadth double precision NOT NULL DEFAULT 0,
  depth double precision NOT NULL DEFAULT 0,
  quantity double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
