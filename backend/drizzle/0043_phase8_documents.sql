-- Phase 8: unified document register, numbering patterns, MOM, site-report actions/photos, templates.

ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "numbering_patterns" jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "esti_document_issue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "project_id" uuid REFERENCES "esti_projectoffice"("id") ON DELETE SET NULL,
  "ref" text NOT NULL,
  "version_no" integer NOT NULL DEFAULT 1,
  "revision_note" text,
  "impact_note" text,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "issued_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "pdf_key" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_issue_entity" ON "esti_document_issue" ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_issue_project" ON "esti_document_issue" ("project_id");

CREATE TABLE IF NOT EXISTS "esti_office_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "tags" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_mom" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "meeting_date" date,
  "venue" text,
  "attendees" text,
  "minutes" text NOT NULL DEFAULT '',
  "version_no" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "pdf_key" text,
  "pdf_status" text NOT NULL DEFAULT 'NONE',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_mom_action" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mom_id" uuid NOT NULL REFERENCES "esti_mom"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "assignee_name" text,
  "due_date" date,
  "status" text NOT NULL DEFAULT 'OPEN',
  "task_id" uuid REFERENCES "esti_task"("id") ON DELETE SET NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "esti_inspection"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'DRAFT';
--> statement-breakpoint
ALTER TABLE "esti_inspection"
  ADD COLUMN IF NOT EXISTS "version_no" integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "esti_inspection_photo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inspection_id" uuid NOT NULL REFERENCES "esti_inspection"("id") ON DELETE CASCADE,
  "storage_key" text NOT NULL,
  "caption" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_inspection_action" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inspection_id" uuid NOT NULL REFERENCES "esti_inspection"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "status" text NOT NULL DEFAULT 'OPEN',
  "assignee_name" text,
  "due_date" date,
  "task_id" uuid REFERENCES "esti_task"("id") ON DELETE SET NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "ref" text UNIQUE;
--> statement-breakpoint
ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "version_no" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'DRAFT';
--> statement-breakpoint
ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "pdf_key" text;
--> statement-breakpoint
ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "pdf_status" text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE "esti_moodboard"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE "esti_specsheet"
  ADD COLUMN IF NOT EXISTS "version_no" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "esti_specsheet"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'DRAFT';
--> statement-breakpoint
ALTER TABLE "esti_specsheet"
  ADD COLUMN IF NOT EXISTS "revision_note" text;

ALTER TABLE "esti_estimate"
  ADD COLUMN IF NOT EXISTS "version_no" integer NOT NULL DEFAULT 1;

ALTER TABLE "esti_bbs"
  ADD COLUMN IF NOT EXISTS "ref" text UNIQUE;
