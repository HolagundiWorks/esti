ALTER TABLE "esti_decision"
  ADD COLUMN IF NOT EXISTS "state" text NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "revision_category" text,
  ADD COLUMN IF NOT EXISTS "owner_id" uuid,
  ADD COLUMN IF NOT EXISTS "owner_name" text,
  ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "review_deadline" date;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "esti_decision" ADD CONSTRAINT "esti_decision_owner_id_esti_user_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "public"."esti_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "esti_decision" SET "state" = 'ACCEPTED' WHERE "approval" = 'APPROVED';
--> statement-breakpoint
UPDATE "esti_decision" SET "state" = 'REJECTED' WHERE "approval" = 'REJECTED';
--> statement-breakpoint
UPDATE "esti_decision" SET "state" = 'LOCKED'   WHERE "status" = 'CLOSED';
