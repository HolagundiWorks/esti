CREATE TABLE IF NOT EXISTS "esti_rate_analysis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "dsr_version_id" uuid REFERENCES "esti_dsr_version"("id"),
  "status" text NOT NULL DEFAULT 'DRAFT',
  "overhead_pct" double precision NOT NULL DEFAULT 0,
  "direct_cost_paise" bigint NOT NULL DEFAULT 0,
  "analysed_rate_paise" bigint NOT NULL DEFAULT 0,
  "created_by" uuid REFERENCES "esti_user"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "esti_rate_component" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rate_analysis_id" uuid NOT NULL REFERENCES "esti_rate_analysis"("id") ON DELETE CASCADE,
  "category" text NOT NULL DEFAULT 'MATERIAL',
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "qty" double precision NOT NULL DEFAULT 1,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "amount_paise" bigint NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
