-- Estimation OS rebuild, phase 1: the keyboard-first estimate measurement
-- sheet. Lines are KB elements (dependencies via parent_line_id); measurement
-- columns live as JSONB; quantity is computed, never stored. Idempotent.
CREATE TABLE IF NOT EXISTS "esti_estimate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_estimate_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "estimate_id" uuid NOT NULL REFERENCES "esti_estimate"("id") ON DELETE CASCADE,
  "parent_line_id" uuid,
  "kb_item_id" uuid REFERENCES "esti_kb_item"("id") ON DELETE SET NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "code" text,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "measurements" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_estimate_project_idx" ON "esti_estimate" ("project_id");
CREATE INDEX IF NOT EXISTS "esti_estimate_line_estimate_idx" ON "esti_estimate_line" ("estimate_id");
