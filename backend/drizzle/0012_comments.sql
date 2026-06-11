CREATE TABLE IF NOT EXISTS "esti_comment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "object_type" text NOT NULL,
  "object_id" text NOT NULL,
  "body" text NOT NULL,
  "actor_id" uuid,
  "actor_name" text,
  "visibility" text DEFAULT 'STAFF' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_comment" ADD CONSTRAINT "esti_comment_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_comment" ADD CONSTRAINT "esti_comment_actor_id_esti_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
