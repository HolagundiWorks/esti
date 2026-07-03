-- Phase 34: usage-earned AORMS identity.
-- Active-app-time ledger per login; at 100 hours the user may generate their
-- permanent AORMS-U handle. Idempotent.
CREATE TABLE IF NOT EXISTS "esti_usage_stat" (
  "user_id" uuid PRIMARY KEY REFERENCES "esti_user"("id") ON DELETE CASCADE,
  "minutes" integer NOT NULL DEFAULT 0,
  "last_ping_at" timestamp with time zone,
  "id_prompt_dismissed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
