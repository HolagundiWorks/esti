-- Construction Knowledge Bank — Phase 2a: item-mapped specification library.
CREATE TABLE IF NOT EXISTS esti_kb_specification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES esti_kb_item(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_kb_specification_item_idx
  ON esti_kb_specification (item_id);
