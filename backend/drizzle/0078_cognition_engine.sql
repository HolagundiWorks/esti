-- AORMS cognition engine: normalized event ingestion, behavior learning, and priority queue.

CREATE TABLE IF NOT EXISTS "esti_cognition_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_key" text NOT NULL,
  "domain" text NOT NULL,
  "event_type" text NOT NULL,
  "subject_type" text NOT NULL,
  "subject_id" text,
  "subject_label" text NOT NULL,
  "project_id" uuid REFERENCES "esti_projectoffice"("id"),
  "actor_id" uuid REFERENCES "esti_user"("id"),
  "severity" text NOT NULL DEFAULT 'watch',
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "occurred_at" timestamp with time zone NOT NULL,
  "observed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "urgency_score" integer NOT NULL DEFAULT 0,
  "financial_impact_paise" bigint NOT NULL DEFAULT 0,
  "dependency_risk_score" integer NOT NULL DEFAULT 0,
  "team_blockage_score" integer NOT NULL DEFAULT 0,
  "meeting_proximity_score" integer NOT NULL DEFAULT 0,
  "deadline_risk_score" integer NOT NULL DEFAULT 0,
  "safe_deferral_score" integer NOT NULL DEFAULT 0,
  "priority_score" integer NOT NULL DEFAULT 0,
  "evidence" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_cognition_event_source_key_uq"
  ON "esti_cognition_event"("source_key");
CREATE INDEX IF NOT EXISTS "esti_cognition_event_status_priority_idx"
  ON "esti_cognition_event"("status", "priority_score" DESC, "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "esti_cognition_event_domain_idx"
  ON "esti_cognition_event"("domain", "event_type");

CREATE TABLE IF NOT EXISTS "esti_cognition_behavior_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "label" text NOT NULL,
  "signal_type" text NOT NULL,
  "sample_count" integer NOT NULL DEFAULT 0,
  "confidence_pct" integer NOT NULL DEFAULT 0,
  "metrics" jsonb NOT NULL DEFAULT '{}',
  "last_observed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_cognition_behavior_profile_uq"
  ON "esti_cognition_behavior_profile"("subject_type", "subject_id", "signal_type");

CREATE TABLE IF NOT EXISTS "esti_cognition_priority_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "esti_cognition_event"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "recommended_action" text NOT NULL,
  "how_to" jsonb NOT NULL DEFAULT '[]',
  "expected_benefit" text NOT NULL,
  "priority_score" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'OPEN',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_cognition_priority_event_uq"
  ON "esti_cognition_priority_item"("event_id");
CREATE INDEX IF NOT EXISTS "esti_cognition_priority_open_idx"
  ON "esti_cognition_priority_item"("status", "priority_score" DESC);
