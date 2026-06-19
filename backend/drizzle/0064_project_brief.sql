CREATE TABLE IF NOT EXISTS "esti_project_brief" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL UNIQUE,
  "basic_info" jsonb,
  "project_info" jsonb,
  "occupants" jsonb,
  "design_prefs" jsonb,
  "space_schedule" jsonb,
  "materials" jsonb,
  "room_details" jsonb,
  "assumptions" text,
  "approval_note" text,
  "approved_at" date,
  "compiled_brief" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "esti_project_brief" ADD CONSTRAINT "esti_project_brief_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_project_brief_project_id_idx" ON "esti_project_brief" ("project_id");
