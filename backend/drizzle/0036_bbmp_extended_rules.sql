-- BBMP extended rule tables: parking, solar, secondary, engine constants (BYLAWS-BBMP.md).
CREATE TABLE IF NOT EXISTS "esti_bbmp_parking_rule" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"         uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "project_type"        text NOT NULL,
  "use_category"        text NOT NULL DEFAULT 'DEFAULT',
  "unit_area_min"       double precision NOT NULL DEFAULT 0,
  "unit_area_max"       double precision NOT NULL DEFAULT 999999999,
  "floor_area_min"      double precision NOT NULL DEFAULT 0,
  "floor_area_max"      double precision NOT NULL DEFAULT 999999999,
  "formula_key"         text NOT NULL,
  "ecs_per_unit"        double precision,
  "ecs_per_sqm"         double precision,
  "sqm_per_ecs"         double precision,
  "visitor_parking_pct" double precision NOT NULL DEFAULT 0.1,
  "source_note"         text,
  "sort_order"          integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_solar_rule" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"     uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "occupancy_type"  text NOT NULL,
  "lpd_required"    double precision NOT NULL,
  "basis"           text NOT NULL,
  "source_note"     text,
  "sort_order"      integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_secondary_rule" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"     uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "rule_key"        text NOT NULL,
  "description"     text NOT NULL,
  "site_area_min"   double precision,
  "plinth_area_min" double precision,
  "height_min_m"    double precision,
  "floors_min"      integer,
  "requirement_json" jsonb NOT NULL DEFAULT '{}',
  "source_note"     text,
  "sort_order"      integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_engine_constant" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"   uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "constant_key"  text NOT NULL,
  "value_num"     double precision NOT NULL,
  "unit"          text,
  "description"   text,
  "sort_order"    integer NOT NULL DEFAULT 0,
  UNIQUE ("rule_set_id", "constant_key")
);
--> statement-breakpoint
-- Engine constants — BBMP Building Bye-Laws 2003 (matches rules.ts defaults).
INSERT INTO "esti_bbmp_engine_constant"
  ("rule_set_id","constant_key","value_num","unit","description","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','lowrise_height_m',9.5,'m','Low-rise vs high-rise setback cutoff',1),
  ('a1111111-1111-4111-8111-111111111111','basement_min_height_m',2.4,'m','Minimum basement floor height',2),
  ('a1111111-1111-4111-8111-111111111111','basement_max_height_m',2.75,'m','Maximum basement floor height',3),
  ('a1111111-1111-4111-8111-111111111111','basement_mech_parking_height_m',3.6,'m','Mechanical parking basement exception',4),
  ('a1111111-1111-4111-8111-111111111111','basement_max_projection_m',1.0,'m','Max basement projection above ground',5),
  ('a1111111-1111-4111-8111-111111111111','visitor_parking_pct',0.1,'ratio','Visitor parking as fraction of required ECS',6),
  ('a1111111-1111-4111-8111-111111111111','sqm_per_ecs',18,'sqm','1 ECS equivalent area',7)
ON CONFLICT ("rule_set_id","constant_key") DO NOTHING;
--> statement-breakpoint
-- Parking rules — BYLAWS-BBMP.md Engine 5.
INSERT INTO "esti_bbmp_parking_rule"
  ("rule_set_id","project_type","use_category","unit_area_min","unit_area_max","formula_key","visitor_parking_pct","source_note","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','RESIDENTIAL','DEFAULT',0,150,'RESIDENTIAL_STANDARD',0.1,'1 ECS per dwelling when unit ≤ 150 sqm',1),
  ('a1111111-1111-4111-8111-111111111111','RESIDENTIAL','DEFAULT',150,999999999,'RESIDENTIAL_LARGE_UNIT',0.1,'1 ECS + 1 per extra 100 sqm above 150 per dwelling',2);
--> statement-breakpoint
INSERT INTO "esti_bbmp_parking_rule"
  ("rule_set_id","project_type","use_category","floor_area_min","floor_area_max","formula_key","sqm_per_ecs","visitor_parking_pct","source_note","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','COMMERCIAL','DEFAULT',0,999999999,'COMMERCIAL_FLOOR_AREA',50,0.1,'1 ECS per 50 sqm built-up',3),
  ('a1111111-1111-4111-8111-111111111111','SEMI_PUBLIC','DEFAULT',0,999999999,'COMMERCIAL_FLOOR_AREA',50,0.1,'Same as commercial',4),
  ('a1111111-1111-4111-8111-111111111111','PUBLIC','DEFAULT',0,999999999,'COMMERCIAL_FLOOR_AREA',50,0.1,'Same as commercial',5);
--> statement-breakpoint
-- Secondary compliance — BYLAWS-BBMP.md Engine 6.
INSERT INTO "esti_bbmp_secondary_rule"
  ("rule_set_id","rule_key","description","site_area_min","plinth_area_min","requirement_json","source_note","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','RAINWATER_HARVESTING','Rainwater harvesting mandatory',200,100,'{"type":"rainwater"}','Plinth > 100 sqm AND site > 200 sqm',1),
  ('a1111111-1111-4111-8111-111111111111','TREE_PLANTING','Minimum tree planting',200,NULL,'{"minTrees":2}','2 trees when site > 200 sqm',2),
  ('a1111111-1111-4111-8111-111111111111','SOLAR_WATER_HEATING','Solar water heating mandatory',200,NULL,'{"type":"solar"}','Site area > 200 sqm',3);
--> statement-breakpoint
INSERT INTO "esti_bbmp_secondary_rule"
  ("rule_set_id","rule_key","description","height_min_m","floors_min","requirement_json","source_note","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','EARTHQUAKE_DESIGN','Earthquake-resistant design (IS 1893)',15,5,'{"standard":"IS 1893"}','Height ≥ 15 m OR floors ≥ G+4',4);
--> statement-breakpoint
-- Solar LPD reference rows (future occupancy-specific lookup).
INSERT INTO "esti_bbmp_solar_rule"
  ("rule_set_id","occupancy_type","lpd_required","basis","source_note","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','HOSPITAL',100,'100 LPD per 4 beds','Example from BYLAWS-BBMP.md — verify against gazette',1),
  ('a1111111-1111-4111-8111-111111111111','RESIDENTIAL',0,'Site area trigger via secondary rule','Boolean trigger only in current engine',2);
