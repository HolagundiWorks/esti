CREATE TABLE IF NOT EXISTS "esti_tender" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"scope" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"due_date" date,
	"instructions" text,
	"awarded_contractor_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_tender_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"access_token" text NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender" ADD CONSTRAINT "esti_tender_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender" ADD CONSTRAINT "esti_tender_awarded_contractor_id_esti_contractor_id_fk" FOREIGN KEY ("awarded_contractor_id") REFERENCES "esti_contractor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender" ADD CONSTRAINT "esti_tender_created_by_id_esti_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender_invitation" ADD CONSTRAINT "esti_tender_invitation_tender_id_esti_tender_id_fk" FOREIGN KEY ("tender_id") REFERENCES "esti_tender"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender_invitation" ADD CONSTRAINT "esti_tender_invitation_contractor_id_esti_contractor_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "esti_contractor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_tender_invitation_tender_contractor_uq" ON "esti_tender_invitation" ("tender_id","contractor_id");
