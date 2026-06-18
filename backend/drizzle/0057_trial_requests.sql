-- Public marketing trial / workspace request leads (landing page form).
CREATE TABLE IF NOT EXISTS "esti_trial_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "work_email" text NOT NULL,
  "mobile" text NOT NULL,
  "company_name" text NOT NULL,
  "role" text NOT NULL,
  "practice_type" text,
  "team_size" text,
  "locations" text,
  "interested_modules" jsonb NOT NULL DEFAULT '[]',
  "current_tools" jsonb NOT NULL DEFAULT '[]',
  "pain_points" jsonb NOT NULL DEFAULT '[]',
  "improvement_notes" text,
  "trial_preference" text NOT NULL,
  "timeline" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "esti_trial_request_created_at_idx"
  ON "esti_trial_request" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "esti_trial_request_work_email_idx"
  ON "esti_trial_request" ("work_email");
