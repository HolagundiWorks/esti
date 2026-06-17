-- Takeoff element tagging + BOQ bridge on measurements
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "element_type_id" text;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "element_category" text;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "height_mm" integer;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "item_count" integer NOT NULL DEFAULT 1;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "boq_qty" double precision;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "boq_unit" text;
ALTER TABLE "esti_measurement" ADD COLUMN IF NOT EXISTS "boq_description" text;
