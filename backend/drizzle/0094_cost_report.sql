-- Construction Cost OS Future row — cost-report PDF (project-level).
-- The Phase-G cost dashboard (dashboard.constructionCost) already rolls the whole
-- A–G spine into one cost-health picture; this is the printable form of it. One
-- row per project (unique project_id), upserted on each "Generate PDF": the
-- backend computes the cost-health model once and stores the whole result in the
-- `snapshot` jsonb, so the worker renders the PDF straight from the snapshot — an
-- exact, reproducible print of what was on screen at `generated_at`, with no
-- read-model SQL duplicated in Python. Carries the async pdf_status / pdf_key slot
-- the render pipeline patches (PENDING → PROCESSING → READY/FAILED). Additive +
-- idempotent (safe to re-run on boot) — the spine is untouched. esti_projectoffice
-- and esti_user predate this migration, so the FKs are inlined.

CREATE TABLE IF NOT EXISTS "esti_cost_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL UNIQUE REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "generated_at" timestamptz,
  "pdf_key" text,
  "pdf_status" text NOT NULL DEFAULT 'NONE',
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
