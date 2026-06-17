-- Phase 11: AI Studio — settings, usage runs, provenance.
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "ai_settings" jsonb NOT NULL DEFAULT '{"enabled":false,"provider":"mock","model":"gpt-4o-mini","allowExternalTransmit":false,"redactPii":true}';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_ai_run" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "esti_user"("id") ON DELETE NO ACTION,
  "project_id" uuid REFERENCES "esti_projectoffice"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "prompt_summary" text,
  "sources" jsonb NOT NULL DEFAULT '[]',
  "output_text" text NOT NULL,
  "approval_state" text NOT NULL DEFAULT 'DRAFT',
  "issued_entity_type" text,
  "issued_entity_id" uuid,
  "used_external_api" text NOT NULL DEFAULT 'false',
  "token_estimate" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_run_user_created" ON "esti_ai_run" ("user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_run_project" ON "esti_ai_run" ("project_id") WHERE "project_id" IS NOT NULL;
