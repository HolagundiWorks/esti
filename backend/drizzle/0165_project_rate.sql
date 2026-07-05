-- Per-project rate overrides (the project-level rate book). Re-costing prefers a
-- project override → office esti_rate_book → as-estimated rate.
CREATE TABLE IF NOT EXISTS "esti_project_rate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "code" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "unit" text NOT NULL DEFAULT '',
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_project_rate_project_code_uq" ON "esti_project_rate" ("project_id", "code");
