CREATE TABLE IF NOT EXISTS "esti_critical_note" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "priority" text DEFAULT 'MEDIUM' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "visibility" text DEFAULT 'STAFF' NOT NULL,
  "owner" text,
  "due_date" date,
  "body" text,
  "actor_id" uuid,
  "actor_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_critical_note" ADD CONSTRAINT "esti_critical_note_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_critical_note" ADD CONSTRAINT "esti_critical_note_actor_id_esti_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_decision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "rationale" text NOT NULL,
  "approval" text DEFAULT 'PENDING' NOT NULL,
  "impact" text DEFAULT 'LOW' NOT NULL,
  "linked_object_type" text,
  "linked_object_id" text,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "actor_id" uuid,
  "actor_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_decision" ADD CONSTRAINT "esti_decision_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_decision" ADD CONSTRAINT "esti_decision_actor_id_esti_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
