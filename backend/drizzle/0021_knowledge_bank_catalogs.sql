CREATE TABLE IF NOT EXISTS "esti_specification_standard" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" text NOT NULL,
  "title" text NOT NULL, "version" text NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT', "project_tags" jsonb NOT NULL DEFAULT '[]',
  "approved_alternatives" jsonb NOT NULL DEFAULT '[]', "issue_checks" jsonb NOT NULL DEFAULT '[]',
  "specification_text" text NOT NULL, "purchase_order_description" text NOT NULL,
  "unit" text NOT NULL, "dsr_item_code" text, "source_citation" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "reviewed_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "published_at" timestamp with time zone, "superseded_by_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_specification_standard_code_idx" ON "esti_specification_standard" ("code", "status");
--> statement-breakpoint
ALTER TABLE "esti_specification_standard" ADD COLUMN IF NOT EXISTS "approved_alternatives" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE "esti_specification_standard" ADD COLUMN IF NOT EXISTS "issue_checks" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_structural_element_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" text NOT NULL,
  "name" text NOT NULL, "family" text NOT NULL, "type" text NOT NULL,
  "version" text NOT NULL, "status" text NOT NULL DEFAULT 'DRAFT',
  "description" text, "geometry" jsonb NOT NULL DEFAULT '{}',
  "reinforcement" jsonb NOT NULL DEFAULT '[]', "source_citation" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "reviewed_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "published_at" timestamp with time zone, "superseded_by_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_structural_element_template_code_idx" ON "esti_structural_element_template" ("code", "status");
