-- Phase: remove RIE/compliance engine, SteelFlow KB catalogue, and BBMP rule
-- reference. Tables are dropped permanently (FE/BE/contracts already unwired).
DROP TABLE IF EXISTS "esti_site_assessment" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_rule_version" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_structural_element_template" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_setback_lowrise_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_setback_highrise_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_far_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_road_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_parking_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_solar_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_secondary_rule" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_engine_constant" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "esti_bbmp_rule_set" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sf_rebars" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sf_stirrups" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sf_elements" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "sf_sessions" CASCADE;
