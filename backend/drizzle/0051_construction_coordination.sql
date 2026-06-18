CREATE TABLE IF NOT EXISTS "esti_contractor_submission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id"),
  "contractor_id" uuid NOT NULL REFERENCES "esti_contractor"("id"),
  "kind" text NOT NULL,
  "subject" text NOT NULL,
  "body" text,
  "status" text NOT NULL DEFAULT 'OPEN',
  "response_note" text,
  "storage_key" text,
  "file_name" text,
  "submitted_by_id" uuid REFERENCES "esti_user"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "esti_submission_message"
  ADD COLUMN IF NOT EXISTS "contractor_submission_id" uuid REFERENCES "esti_contractor_submission"("id") ON DELETE CASCADE;
