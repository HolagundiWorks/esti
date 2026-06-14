CREATE TABLE IF NOT EXISTS "esti_submission_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_submission_id" uuid,
	"consultant_submission_id" uuid,
	"author_id" uuid,
	"author_name" text,
	"author_side" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_submission_message" ADD CONSTRAINT "esti_submission_message_portal_submission_id_fk" FOREIGN KEY ("portal_submission_id") REFERENCES "esti_portal_submission"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_submission_message" ADD CONSTRAINT "esti_submission_message_consultant_submission_id_fk" FOREIGN KEY ("consultant_submission_id") REFERENCES "esti_consultant_submission"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_submission_message" ADD CONSTRAINT "esti_submission_message_author_id_esti_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
