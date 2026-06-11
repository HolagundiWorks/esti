ALTER TABLE "esti_projectoffice" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "esti_projectoffice" ADD COLUMN "archived_by_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_projectoffice" ADD CONSTRAINT "esti_projectoffice_archived_by_id_esti_user_id_fk" FOREIGN KEY ("archived_by_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
