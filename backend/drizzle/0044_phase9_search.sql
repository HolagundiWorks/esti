-- Phase 9: permission-aware search indexes + project lessons learned.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "esti_lesson_learned" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'OTHER',
  "body" text NOT NULL,
  "recommendations" text NOT NULL DEFAULT '',
  "tags" text,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "author_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "author_name" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lesson_project" ON "esti_lesson_learned" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lesson_status" ON "esti_lesson_learned" ("status");

-- Trigram indexes for universal search (permission checks remain in application layer).
CREATE INDEX IF NOT EXISTS "idx_projectoffice_title_trgm" ON "esti_projectoffice" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projectoffice_ref_trgm" ON "esti_projectoffice" USING gin ("ref" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_client_name_trgm" ON "esti_client" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_title_trgm" ON "esti_task" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drawing_ref_trgm" ON "esti_drawing" USING gin ("ref" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drawing_title_trgm" ON "esti_drawing" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_office_template_title_trgm" ON "esti_office_template" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsr_item_desc_trgm" ON "esti_dsr_item" USING gin ("description" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_spec_catalog_item_trgm" ON "esti_spec_catalog_item" USING gin ("item" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lesson_title_trgm" ON "esti_lesson_learned" USING gin ("title" gin_trgm_ops);
