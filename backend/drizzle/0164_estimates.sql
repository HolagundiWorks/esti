-- Imported estimate snapshots (.aormsest). Quantities frozen in `pack`; costing
-- is computed live against esti_rate_book, never stored.
CREATE TABLE IF NOT EXISTS "esti_estimate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid,
  "title" text NOT NULL,
  "source_rate_book_code" text,
  "source_rate_book_name" text,
  "source_file_key" text,
  "checksum" text,
  "format_version" integer NOT NULL DEFAULT 1,
  "pack" jsonb NOT NULL,
  "uploaded_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_estimate_project_idx" ON "esti_estimate" ("project_id");
