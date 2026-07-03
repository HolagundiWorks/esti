-- ESTI Pulse (P-2): the standup loop — scheduled standup sessions and the
-- targeted, grouped questions they ask. Spec: docs/esti/ESTI-PULSE.md.

CREATE TABLE IF NOT EXISTS "esti_standup_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "session_type" text NOT NULL,
  "scheduled_at" timestamp with time zone NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "status" text NOT NULL DEFAULT 'PENDING',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "esti_standup_session_project_idx"
  ON "esti_standup_session" ("project_id", "session_type", "scheduled_at");

CREATE TABLE IF NOT EXISTS "esti_standup_question" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "standup_session_id" uuid NOT NULL REFERENCES "esti_standup_session"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "question_text" text NOT NULL,
  "asked_to" uuid REFERENCES "esti_teammember"("id") ON DELETE SET NULL,
  "response_status" text NOT NULL DEFAULT 'PENDING',
  "response_text" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "answered_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "esti_standup_question_session_idx"
  ON "esti_standup_question" ("standup_session_id");
CREATE INDEX IF NOT EXISTS "esti_standup_question_asked_to_idx"
  ON "esti_standup_question" ("asked_to", "response_status");
