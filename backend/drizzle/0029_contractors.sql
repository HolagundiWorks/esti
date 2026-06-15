CREATE TABLE IF NOT EXISTS "esti_contractor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"company_name" text,
	"contact_person" text,
	"gstin" text,
	"pan" text,
	"email" text,
	"phone" text,
	"city" text,
	"state" text,
	"active" boolean DEFAULT true NOT NULL,
	"quality_rating" integer,
	"timeliness_rating" integer,
	"safety_rating" integer,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_contractor" ADD CONSTRAINT "esti_contractor_created_by_id_esti_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
