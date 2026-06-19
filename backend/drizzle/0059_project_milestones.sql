CREATE TABLE IF NOT EXISTS "esti_project_milestone" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "phase_id" uuid REFERENCES "esti_phase"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "target_date" date,
  "status" text NOT NULL DEFAULT 'PLANNED',
  "sort_order" integer NOT NULL DEFAULT 0,
  "task_id" uuid REFERENCES "esti_task"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_project_milestone_project_idx"
  ON "esti_project_milestone" ("project_id");

CREATE INDEX IF NOT EXISTS "esti_project_milestone_target_date_idx"
  ON "esti_project_milestone" ("target_date");
