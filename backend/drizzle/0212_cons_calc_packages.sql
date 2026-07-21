-- 0212 — AORMS-Consultancy Phase 4 (P9.4): CalculationPackage lineage.
-- D4: track inputs / assumptions / code refs / outputs — no in-app calc engine.
CREATE TABLE IF NOT EXISTS esti_cons_calc_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES esti_cons_engagement(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES esti_cons_deliverable(id) ON DELETE SET NULL,
  input_pack_id uuid REFERENCES esti_cons_input_pack(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  revision text NOT NULL DEFAULT 'P01',
  status text NOT NULL DEFAULT 'DRAFT',
  software_tool text,
  code_refs text,
  assumptions text,
  inputs_summary text,
  outputs_summary text,
  prepared_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  prepared_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_calc_package_engagement_idx
  ON esti_cons_calc_package(engagement_id);
CREATE INDEX IF NOT EXISTS esti_cons_calc_package_deliverable_idx
  ON esti_cons_calc_package(deliverable_id);
