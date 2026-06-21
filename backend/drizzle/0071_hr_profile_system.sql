-- 0071: HR Profile System
-- Adds: staff_level + job_title to esti_teammember
--       esti_hr_profile (personal details vault)
--       esti_hr_document (document registry)
--       esti_job_application (hiring pipeline)

ALTER TABLE "esti_teammember" ADD COLUMN IF NOT EXISTS "staff_level" text;
ALTER TABLE "esti_teammember" ADD COLUMN IF NOT EXISTS "job_title" text;

CREATE TABLE IF NOT EXISTS "esti_hr_profile" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_id"                 uuid NOT NULL REFERENCES "esti_teammember"("id") ON DELETE CASCADE,
  -- Personal
  "date_of_birth"             date,
  "gender"                    text,
  "blood_group"               text,
  "nationality"               text NOT NULL DEFAULT 'Indian',
  -- Government IDs
  "aadhaar_number"            text,
  "pan_number"                text,
  "passport_number"           text,
  "passport_expiry"           date,
  "passport_country"          text DEFAULT 'India',
  "voter_id"                  text,
  "driving_licence"           text,
  -- Addresses
  "permanent_address"         jsonb,
  "current_address"           jsonb,
  "same_address"              boolean NOT NULL DEFAULT false,
  -- Communication
  "personal_email"            text,
  "personal_phone"            text,
  "emergency_contact_name"    text,
  "emergency_contact_relation" text,
  "emergency_contact_phone"   text,
  -- Payroll / financial
  "bank_account_number"       text,
  "bank_ifsc"                 text,
  "bank_name"                 text,
  "bank_branch"               text,
  "pf_uan"                    text,
  "esic_number"               text,
  -- Timestamps
  "created_at"                timestamptz NOT NULL DEFAULT now(),
  "updated_at"                timestamptz NOT NULL DEFAULT now(),
  UNIQUE("member_id")
);

CREATE TABLE IF NOT EXISTS "esti_hr_document" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_id"     uuid NOT NULL REFERENCES "esti_teammember"("id") ON DELETE CASCADE,
  "document_type" text NOT NULL,
  "document_name" text NOT NULL,
  "s3_key"        text,
  "file_name"     text,
  "file_size"     integer,
  "mime_type"     text,
  "issue_date"    date,
  "expiry_date"   date,
  "verified_by"   uuid REFERENCES "esti_user"("id"),
  "verified_at"   timestamptz,
  "notes"         text,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_job_application" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                    text NOT NULL,
  "email"                   text,
  "phone"                   text,
  "applied_role"            text NOT NULL,
  "experience_years"        numeric(4,1),
  "current_employer"        text,
  "current_salary_paise"    bigint,
  "expected_salary_paise"   bigint,
  "resume_key"              text,
  "portfolio_url"           text,
  "status"                  text NOT NULL DEFAULT 'APPLIED',
  "notes"                   text,
  "handled_by"              uuid REFERENCES "esti_user"("id"),
  "member_id"               uuid REFERENCES "esti_teammember"("id"),
  "applied_at"              timestamptz NOT NULL DEFAULT now(),
  "status_updated_at"       timestamptz NOT NULL DEFAULT now(),
  "created_at"              timestamptz NOT NULL DEFAULT now(),
  "updated_at"              timestamptz NOT NULL DEFAULT now()
);
