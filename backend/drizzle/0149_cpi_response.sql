-- Client–Project Intelligence (CPI): residential onboarding questionnaire.
-- One row per project; sections are a JSONB map keyed by CpiSectionId
-- (contracts/cpi.ts) and the report is the synthesized Client Intelligence
-- Report (Section 21). Idempotent.
CREATE TABLE IF NOT EXISTS "esti_cpi_response" (
  "project_id" uuid PRIMARY KEY REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "sections" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "report" jsonb,
  "report_generated_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
