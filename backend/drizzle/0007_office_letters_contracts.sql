CREATE TABLE IF NOT EXISTS "esti_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"party" text NOT NULL,
	"contract_type" text DEFAULT 'CLIENT' NOT NULL,
	"value_paise" bigint DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_contract_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_letter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"date_letter" date,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_letter_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_contract" ADD CONSTRAINT "esti_contract_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_letter" ADD CONSTRAINT "esti_letter_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
