-- AORMS Identity I-4 — portable records keyed to the person's AORMS-U handle
-- (hlp_account.public_id), never to a company. Certifications and growth events
-- follow the individual across firms.
CREATE TABLE IF NOT EXISTS "hlp_certification" (
  "id" text PRIMARY KEY NOT NULL,
  "account_public_id" text NOT NULL,
  "title" text NOT NULL,
  "issuer" text,
  "issued_at" timestamp with time zone,
  "evidence_key" text,
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "hlp_certification_account_idx"
  ON "hlp_certification" ("account_public_id");

CREATE TABLE IF NOT EXISTS "hlp_growth_event" (
  "id" text PRIMARY KEY NOT NULL,
  "account_public_id" text NOT NULL,
  "kind" text NOT NULL,
  "value" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "org_public_id" text,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "hlp_growth_event_account_idx"
  ON "hlp_growth_event" ("account_public_id");
