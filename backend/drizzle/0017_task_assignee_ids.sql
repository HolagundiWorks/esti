-- Link team members to their user accounts (for "my tasks" resolution).
ALTER TABLE "esti_teammember"
  ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "esti_teammember" ADD CONSTRAINT "esti_teammember_user_id_esti_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."esti_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_teammember_user_id_unique" ON "esti_teammember" ("user_id")
  WHERE "user_id" IS NOT NULL;
--> statement-breakpoint
-- Task: assignee/reviewer as FK refs, dependency chain, ASPRF classification.
ALTER TABLE "esti_task"
  ADD COLUMN IF NOT EXISTS "assignee_id" uuid,
  ADD COLUMN IF NOT EXISTS "reviewer_id" uuid,
  ADD COLUMN IF NOT EXISTS "depends_on_id" uuid,
  ADD COLUMN IF NOT EXISTS "classification" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "esti_task" ADD CONSTRAINT "esti_task_assignee_id_esti_teammember_id_fk"
    FOREIGN KEY ("assignee_id") REFERENCES "public"."esti_teammember"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "esti_task" ADD CONSTRAINT "esti_task_reviewer_id_esti_teammember_id_fk"
    FOREIGN KEY ("reviewer_id") REFERENCES "public"."esti_teammember"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "esti_task" ADD CONSTRAINT "esti_task_depends_on_id_esti_task_id_fk"
    FOREIGN KEY ("depends_on_id") REFERENCES "public"."esti_task"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
