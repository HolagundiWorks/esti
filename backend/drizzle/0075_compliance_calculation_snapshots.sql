CREATE TABLE IF NOT EXISTS "esti_compliance_calculation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid,
  "mode" text NOT NULL,
  "authority" text DEFAULT 'BBMP' NOT NULL,
  "city" text DEFAULT 'bangalore' NOT NULL,
  "rule_version" text,
  "bbmp_rule_set_id" uuid,
  "input_json" jsonb NOT NULL,
  "result_json" jsonb NOT NULL,
  "overall_status" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "esti_compliance_calculation" ADD CONSTRAINT "esti_compliance_calculation_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "esti_compliance_calculation" ADD CONSTRAINT "esti_compliance_calculation_rule_set_id_esti_bbmp_rule_set_id_fk" FOREIGN KEY ("bbmp_rule_set_id") REFERENCES "public"."esti_bbmp_rule_set"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "esti_compliance_calculation_project_created_idx" ON "esti_compliance_calculation" ("project_id", "created_at");
CREATE INDEX IF NOT EXISTS "esti_compliance_calculation_mode_idx" ON "esti_compliance_calculation" ("mode");
