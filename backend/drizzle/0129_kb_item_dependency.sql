-- CMS-3 / KB Phase 5: item dependencies.
-- A parent activity implies a child activity at a derived quantity
-- (child qty = parent qty × ratio). Drives Component auto-generation.

CREATE TABLE esti_kb_item_dependency (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id  uuid NOT NULL REFERENCES esti_kb_item(id) ON DELETE CASCADE,
  child_item_id   uuid NOT NULL REFERENCES esti_kb_item(id) ON DELETE CASCADE,
  ratio           double precision NOT NULL DEFAULT 1,
  dependency_type text NOT NULL DEFAULT 'MANDATORY',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_kb_item_dependency (parent_item_id);
CREATE INDEX ON esti_kb_item_dependency (child_item_id);
