CREATE TABLE IF NOT EXISTS "esti_po_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"description" text NOT NULL,
	"unit" text,
	"qty" double precision DEFAULT 0 NOT NULL,
	"rate_paise" bigint DEFAULT 0 NOT NULL,
	"amount_paise" bigint DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_purchaseorder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"vendor" text,
	"title" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"date_po" date,
	"notes" text,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_purchaseorder_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_po_item" ADD CONSTRAINT "esti_po_item_po_id_esti_purchaseorder_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."esti_purchaseorder"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_purchaseorder" ADD CONSTRAINT "esti_purchaseorder_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
