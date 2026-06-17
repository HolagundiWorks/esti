-- Phase 10: commercial expansion — estimate/BBS PDF, reconcile mapping, APBF appointment.

ALTER TABLE "esti_estimate"
  ADD COLUMN IF NOT EXISTS "pdf_key" text;
--> statement-breakpoint
ALTER TABLE "esti_estimate"
  ADD COLUMN IF NOT EXISTS "pdf_status" text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE "esti_estimate"
  ADD COLUMN IF NOT EXISTS "revision_note" text;

ALTER TABLE "esti_bbs"
  ADD COLUMN IF NOT EXISTS "pdf_key" text;
--> statement-breakpoint
ALTER TABLE "esti_bbs"
  ADD COLUMN IF NOT EXISTS "pdf_status" text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE "esti_bbs"
  ADD COLUMN IF NOT EXISTS "version_no" integer NOT NULL DEFAULT 1;

ALTER TABLE "esti_reconcile"
  ADD COLUMN IF NOT EXISTS "column_mapping" jsonb;

CREATE TABLE IF NOT EXISTS "esti_appointment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "site_visit_date" date,
  "scope_summary" text,
  "letter_id" uuid REFERENCES "esti_letter"("id") ON DELETE SET NULL,
  "fee_proposal_id" uuid,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_appointment_project_uq" ON "esti_appointment" ("project_id");
