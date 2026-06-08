ALTER TABLE "esti_drawing" ADD COLUMN "rev_no" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "esti_drawing" ADD COLUMN "root_id" uuid;--> statement-breakpoint
ALTER TABLE "esti_drawing" ADD COLUMN "revision_note" text;--> statement-breakpoint
ALTER TABLE "esti_drawing" ADD COLUMN "is_current" boolean DEFAULT true NOT NULL;