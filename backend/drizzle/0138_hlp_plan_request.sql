-- Self-serve plan requests. A person signs up and requests a tier (LITE/CORE/
-- ENTERPRISE); a platform admin sees it in the portal queue and fulfils it —
-- creating the licence and emailing the key from the portal.
CREATE TABLE IF NOT EXISTS "hlp_plan_request" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL REFERENCES "hlp_account"("id"),
  "org_id" text REFERENCES "hlp_organization"("id"),
  "email" text NOT NULL,
  "product_code" text NOT NULL DEFAULT 'AORMS',
  "plan_code" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "note" text,
  "license_id" text REFERENCES "hlp_license"("id"),
  "decided_by" text,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "hlp_plan_request_status_idx" ON "hlp_plan_request" ("status");
CREATE INDEX IF NOT EXISTS "hlp_plan_request_account_idx" ON "hlp_plan_request" ("account_id");
