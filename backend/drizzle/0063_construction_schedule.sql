CREATE TABLE IF NOT EXISTS "esti_construction_schedule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL UNIQUE REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "baseline_name" text NOT NULL DEFAULT 'Baseline 1',
  "project_start" date NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "version_no" integer NOT NULL DEFAULT 1,
  "template_key" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_construction_schedule_project_idx"
  ON "esti_construction_schedule" ("project_id");

CREATE TABLE IF NOT EXISTS "esti_construction_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "schedule_id" uuid NOT NULL REFERENCES "esti_construction_schedule"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "esti_construction_activity"("id") ON DELETE SET NULL,
  "wbs_code" text NOT NULL,
  "title" text NOT NULL,
  "trade" text,
  "location" text,
  "duration_days" integer NOT NULL DEFAULT 1,
  "planned_start" date,
  "planned_end" date,
  "actual_start" date,
  "actual_end" date,
  "percent_complete" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "early_start" integer,
  "early_finish" integer,
  "late_start" integer,
  "late_finish" integer,
  "total_float" integer,
  "is_critical" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_construction_activity_project_idx"
  ON "esti_construction_activity" ("project_id");
CREATE INDEX IF NOT EXISTS "esti_construction_activity_schedule_idx"
  ON "esti_construction_activity" ("schedule_id");

CREATE TABLE IF NOT EXISTS "esti_construction_dependency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "predecessor_id" uuid NOT NULL REFERENCES "esti_construction_activity"("id") ON DELETE CASCADE,
  "successor_id" uuid NOT NULL REFERENCES "esti_construction_activity"("id") ON DELETE CASCADE,
  "type" text NOT NULL DEFAULT 'FS',
  "lag_days" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "esti_construction_dependency_project_idx"
  ON "esti_construction_dependency" ("project_id");
CREATE INDEX IF NOT EXISTS "esti_construction_dependency_pred_idx"
  ON "esti_construction_dependency" ("predecessor_id");
CREATE INDEX IF NOT EXISTS "esti_construction_dependency_succ_idx"
  ON "esti_construction_dependency" ("successor_id");
