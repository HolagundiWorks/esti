-- ESTI Pulse (P-3): the approval-based action agent. Proposals never
-- execute without a recorded human approval. Spec: docs/esti/ESTI-PULSE.md.

ALTER TABLE "esti_standup_question" ADD COLUMN IF NOT EXISTS "escalation_rung" text NOT NULL DEFAULT 'ASSIGNEE';

CREATE TABLE IF NOT EXISTS "esti_pulse_action" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "action_type" text NOT NULL,
  "standup_question_id" uuid REFERENCES "esti_standup_question"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "esti_task"("id") ON DELETE CASCADE,
  "target_team_member_id" uuid REFERENCES "esti_teammember"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PROPOSED',
  "decided_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "decided_at" timestamp with time zone,
  "executed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "esti_pulse_action_status_idx" ON "esti_pulse_action" ("status");
CREATE INDEX IF NOT EXISTS "esti_pulse_action_question_idx" ON "esti_pulse_action" ("standup_question_id");
