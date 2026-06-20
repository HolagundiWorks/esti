ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "pack_id" text;
ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "read_only" boolean NOT NULL DEFAULT false;
ALTER TABLE "esti_dsr_version" ADD COLUMN IF NOT EXISTS "city_key" text;

ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "pack_id" text;
ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "read_only" boolean NOT NULL DEFAULT false;
ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "city_key" text;
ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "state_code" text;
ALTER TABLE "esti_bbmp_rule_set" ADD COLUMN IF NOT EXISTS "authority_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "esti_dsr_version_official_pack_city_uidx"
  ON "esti_dsr_version" ("pack_id", "city_key")
  WHERE "pack_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "esti_bbmp_rule_set_official_pack_city_uidx"
  ON "esti_bbmp_rule_set" ("pack_id", "city_key")
  WHERE "pack_id" IS NOT NULL;
