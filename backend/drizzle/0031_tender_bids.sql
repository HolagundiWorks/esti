CREATE TABLE IF NOT EXISTS "esti_tender_bid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"amount_paise" bigint DEFAULT 0 NOT NULL,
	"completion_weeks" integer,
	"technical_score" integer,
	"notes" text,
	"submitted_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender_bid" ADD CONSTRAINT "esti_tender_bid_invitation_id_esti_tender_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "esti_tender_invitation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_tender_bid" ADD CONSTRAINT "esti_tender_bid_submitted_by_id_esti_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_tender_bid_invitation_uq" ON "esti_tender_bid" ("invitation_id");
