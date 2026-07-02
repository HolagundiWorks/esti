-- ESTI Pulse (P-1): dependency graph, missing parameters, priority audit log,
-- and a confidence score on esti_task. Spec: docs/esti/ESTI-PULSE.md.

ALTER TABLE "esti_task" ADD COLUMN IF NOT EXISTS "confidence_score" integer NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS "esti_task_dependency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "depends_on_task_id" uuid NOT NULL REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "dependency_type" text NOT NULL DEFAULT 'BLOCKS',
  "status" text NOT NULL DEFAULT 'OPEN',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "esti_task_dependency_edge_idx"
  ON "esti_task_dependency" ("task_id", "depends_on_task_id");

CREATE TABLE IF NOT EXISTS "esti_task_missing_param" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "parameter_type" text NOT NULL,
  "description" text,
  "assigned_to" uuid REFERENCES "esti_teammember"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'OPEN',
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "esti_task_missing_param_task_idx"
  ON "esti_task_missing_param" ("task_id", "status");

CREATE TABLE IF NOT EXISTS "esti_task_priority_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "old_priority_score" integer,
  "new_priority_score" integer NOT NULL,
  "old_confidence_score" integer,
  "new_confidence_score" integer NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "esti_task_priority_log_task_idx"
  ON "esti_task_priority_log" ("task_id", "created_at");
