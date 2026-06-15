-- BBMP modular rule engine — FAR, setbacks, road margins (BYLAWS-BBMP.md).
CREATE TABLE IF NOT EXISTS "esti_bbmp_rule_set" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label"            text NOT NULL,
  "effective_date"   date NOT NULL,
  "status"           text NOT NULL DEFAULT 'DRAFT',
  "source_citation"  text,
  "notes"            text,
  "active"           boolean NOT NULL DEFAULT false,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_far_rule" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"      uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "development_area" text NOT NULL,
  "site_area_min"    double precision NOT NULL,
  "site_area_max"    double precision NOT NULL,
  "road_width_min"   double precision NOT NULL,
  "road_width_max"   double precision NOT NULL,
  "residential_far"  double precision NOT NULL,
  "commercial_far"   double precision NOT NULL,
  "semi_public_far"  double precision NOT NULL,
  "public_far"       double precision NOT NULL,
  "max_coverage"     double precision NOT NULL,
  "sort_order"       integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_setback_lowrise_rule" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"      uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "depth_min"        double precision NOT NULL,
  "depth_max"        double precision NOT NULL,
  "width_min"        double precision NOT NULL,
  "width_max"        double precision NOT NULL,
  "front"            double precision NOT NULL,
  "rear"             double precision NOT NULL,
  "left"             double precision NOT NULL,
  "right"            double precision NOT NULL,
  "sort_order"       integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_setback_highrise_rule" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"      uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "height_min"       double precision NOT NULL,
  "height_max"       double precision NOT NULL,
  "uniform_setback"  double precision NOT NULL,
  "sort_order"       integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbmp_road_rule" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id"      uuid NOT NULL REFERENCES "esti_bbmp_rule_set"("id") ON DELETE CASCADE,
  "road_class"       text NOT NULL,
  "road_margin_m"    double precision NOT NULL,
  "sort_order"       integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "esti_bylaw_calc" ADD COLUMN IF NOT EXISTS "bbmp_rule_set_id" uuid REFERENCES "esti_bbmp_rule_set"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "esti_site_assessment" ADD COLUMN IF NOT EXISTS "bbmp_rule_set_id" uuid REFERENCES "esti_bbmp_rule_set"("id") ON DELETE SET NULL;
--> statement-breakpoint
-- Seed: BBMP Building Bye-Laws 2003 (matches packages/contracts/src/bbmp/rules.ts).
INSERT INTO "esti_bbmp_rule_set"
  ("id","label","effective_date","status","source_citation","notes","active")
VALUES (
  'a1111111-1111-4111-8111-111111111111',
  'BBMP Building Bye-Laws 2003',
  '2003-01-01',
  'PUBLISHED',
  'BBMP Building Bye-Laws 2003 — verify against current gazette before production use',
  'Seed values aligned with BYLAWS-BBMP.md modular engine',
  true
);
--> statement-breakpoint
INSERT INTO "esti_bbmp_far_rule"
  ("rule_set_id","development_area","site_area_min","site_area_max","road_width_min","road_width_max","residential_far","commercial_far","semi_public_far","public_far","max_coverage","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','A',0,240,0,6,0.75,1.0,1.0,1.0,50,1),
  ('a1111111-1111-4111-8111-111111111111','A',240,500,6,9,0.75,1.0,1.0,1.0,50,2),
  ('a1111111-1111-4111-8111-111111111111','A',500,1000,9,12,1.0,1.25,1.25,1.25,55,3),
  ('a1111111-1111-4111-8111-111111111111','A',1000,2000,12,18,1.25,1.5,1.5,1.5,55,4),
  ('a1111111-1111-4111-8111-111111111111','A',2000,999999999,18,999999999,1.5,1.75,1.75,1.75,60,5),
  ('a1111111-1111-4111-8111-111111111111','B',0,500,0,9,1.0,1.25,1.25,1.25,55,6),
  ('a1111111-1111-4111-8111-111111111111','B',500,2000,9,18,1.5,1.75,1.75,1.75,60,7),
  ('a1111111-1111-4111-8111-111111111111','B',2000,999999999,18,999999999,1.75,2.0,2.0,2.0,60,8),
  ('a1111111-1111-4111-8111-111111111111','C',0,1000,0,12,1.25,1.5,1.5,1.5,55,9),
  ('a1111111-1111-4111-8111-111111111111','C',1000,999999999,12,999999999,1.75,2.25,2.25,2.25,65,10);
--> statement-breakpoint
INSERT INTO "esti_bbmp_setback_lowrise_rule"
  ("rule_set_id","depth_min","depth_max","width_min","width_max","front","rear","left","right","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111',0,12,0,12,2.0,1.0,1.0,2.0,1),
  ('a1111111-1111-4111-8111-111111111111',12,18,12,18,3.0,1.5,1.5,3.0,2),
  ('a1111111-1111-4111-8111-111111111111',18,24,18,24,4.0,2.0,2.0,4.0,3),
  ('a1111111-1111-4111-8111-111111111111',24,999999999,24,999999999,5.0,2.5,2.5,5.0,4);
--> statement-breakpoint
INSERT INTO "esti_bbmp_setback_highrise_rule"
  ("rule_set_id","height_min","height_max","uniform_setback","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111',9.5,12,4.5,1),
  ('a1111111-1111-4111-8111-111111111111',12,15,5.0,2),
  ('a1111111-1111-4111-8111-111111111111',15,18,6.0,3),
  ('a1111111-1111-4111-8111-111111111111',18,24,7.5,4),
  ('a1111111-1111-4111-8111-111111111111',24,30,9.0,5),
  ('a1111111-1111-4111-8111-111111111111',30,35,11.0,6),
  ('a1111111-1111-4111-8111-111111111111',35,999999999,12.0,7);
--> statement-breakpoint
INSERT INTO "esti_bbmp_road_rule"
  ("rule_set_id","road_class","road_margin_m","sort_order")
VALUES
  ('a1111111-1111-4111-8111-111111111111','NH',12,1),
  ('a1111111-1111-4111-8111-111111111111','SH',9,2),
  ('a1111111-1111-4111-8111-111111111111','ARTERIAL',6,3),
  ('a1111111-1111-4111-8111-111111111111','COLLECTOR',4.5,4),
  ('a1111111-1111-4111-8111-111111111111','LOCAL',3,5);
