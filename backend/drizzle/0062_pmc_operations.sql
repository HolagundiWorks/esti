ALTER TABLE "esti_contractor_submission"
  ADD COLUMN IF NOT EXISTS "review_code" text,
  ADD COLUMN IF NOT EXISTS "review_note" text,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;

CREATE TABLE IF NOT EXISTS "esti_snag" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "ref" text NOT NULL,
  "location" text,
  "trade" text,
  "description" text NOT NULL,
  "status" text NOT NULL DEFAULT 'OPEN',
  "photo_key" text,
  "contractor_submission_id" uuid REFERENCES "esti_contractor_submission"("id") ON DELETE SET NULL,
  "due_date" date,
  "closed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_snag_project_idx" ON "esti_snag" ("project_id");

CREATE TABLE IF NOT EXISTS "esti_site_instruction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "contractor_id" uuid REFERENCES "esti_contractor"("id") ON DELETE SET NULL,
  "subject" text NOT NULL,
  "body" text,
  "issued_at" date,
  "acknowledged_at" timestamptz,
  "pdf_key" text,
  "pdf_status" text NOT NULL DEFAULT 'NONE',
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_site_instruction_project_idx" ON "esti_site_instruction" ("project_id");

CREATE TABLE IF NOT EXISTS "esti_progress_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "narrative" text,
  "physical_progress_pct" integer,
  "schedule_progress_pct" integer,
  "open_snag_count" integer NOT NULL DEFAULT 0,
  "open_rfi_count" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "pdf_key" text,
  "pdf_status" text NOT NULL DEFAULT 'NONE',
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_progress_report_project_idx" ON "esti_progress_report" ("project_id");

CREATE TABLE IF NOT EXISTS "esti_phase_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phase_id" uuid NOT NULL REFERENCES "esti_phase"("id") ON DELETE CASCADE,
  "live_stage_code" text NOT NULL,
  "label" text NOT NULL,
  "status" text NOT NULL DEFAULT 'NOT_STARTED',
  "completed_at" timestamptz,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_phase_progress_phase_stage_idx"
  ON "esti_phase_progress" ("phase_id", "live_stage_code");
