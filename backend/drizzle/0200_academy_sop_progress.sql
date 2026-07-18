-- LXOS Academy — SOP theory/practical progress per user (docs/holagundi/SOP.md).

CREATE TABLE IF NOT EXISTS esti_sop_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES esti_user(id) ON DELETE CASCADE,
  sop_code text NOT NULL,
  theory_read_at timestamptz,
  practical_source text,
  practical_at timestamptz,
  practical_note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS esti_sop_progress_user_sop_idx
  ON esti_sop_progress (user_id, sop_code);
