-- Post-construction compliance audit storage (BYLAW-SYSTEMS.md).
ALTER TABLE "esti_bylaw_calc" ADD COLUMN IF NOT EXISTS "postconstruction_input" jsonb;
--> statement-breakpoint
ALTER TABLE "esti_bylaw_calc" ADD COLUMN IF NOT EXISTS "postconstruction_audit" jsonb;
--> statement-breakpoint
ALTER TABLE "esti_bylaw_calc" ADD COLUMN IF NOT EXISTS "precomputed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "esti_bylaw_calc" ADD COLUMN IF NOT EXISTS "postcomputed_at" timestamp with time zone;
