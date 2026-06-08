CREATE TABLE IF NOT EXISTS "esti_inspection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"date_visit" date,
	"weather" text,
	"attendees" text,
	"progress" text,
	"observations" text,
	"instructions" text,
	"next_visit" date,
	"inspector_name" text,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_inspection_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_moodboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_moodimage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mood_board_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"work_type" text DEFAULT 'ARCHITECTURE' NOT NULL,
	"scope" text,
	"fee_paise" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_proposal_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_specitem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_sheet_id" uuid NOT NULL,
	"category" text,
	"item" text NOT NULL,
	"make" text,
	"specification" text,
	"finish" text,
	"remarks" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_specsheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_specsheet_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_inspection" ADD CONSTRAINT "esti_inspection_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_moodboard" ADD CONSTRAINT "esti_moodboard_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_moodimage" ADD CONSTRAINT "esti_moodimage_mood_board_id_esti_moodboard_id_fk" FOREIGN KEY ("mood_board_id") REFERENCES "public"."esti_moodboard"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_proposal" ADD CONSTRAINT "esti_proposal_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_specitem" ADD CONSTRAINT "esti_specitem_spec_sheet_id_esti_specsheet_id_fk" FOREIGN KEY ("spec_sheet_id") REFERENCES "public"."esti_specsheet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_specsheet" ADD CONSTRAINT "esti_specsheet_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
