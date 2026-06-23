ALTER TABLE "esti_estimate_item"
  ADD COLUMN IF NOT EXISTS "source_kind" text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "dsr_item_code" text,
  ADD COLUMN IF NOT EXISTS "dsr_item_description" text,
  ADD COLUMN IF NOT EXISTS "dsr_version_label" text,
  ADD COLUMN IF NOT EXISTS "source_measurement_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "source_payload" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "esti_estimate_item_source_kind_idx"
  ON "esti_estimate_item" ("source_kind");
