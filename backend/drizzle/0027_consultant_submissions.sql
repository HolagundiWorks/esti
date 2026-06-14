CREATE TABLE IF NOT EXISTS "esti_consultant_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"consultant_id" uuid,
	"kind" text NOT NULL,
	"object_type" text,
	"object_id" uuid,
	"subject" text NOT NULL,
	"body" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"response_note" text,
	"submitted_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_consultant_submission" ADD CONSTRAINT "esti_consultant_submission_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_consultant_submission" ADD CONSTRAINT "esti_consultant_submission_consultant_id_esti_consultant_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "esti_consultant"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_consultant_submission" ADD CONSTRAINT "esti_consultant_submission_submitted_by_id_esti_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
