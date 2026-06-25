-- Estimation OS (Phase 29) — costing spine: design-stage fields, component
-- master, IFC mapping, related-item templates, estimate components, and frozen
-- estimate versions. Additive + idempotent (safe to re-run on boot).

ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "stage" text NOT NULL DEFAULT 'DESIGN';
--> statement-breakpoint
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "confidence" text;
--> statement-breakpoint
ALTER TABLE "esti_estimate" ADD COLUMN IF NOT EXISTS "basis_note" text;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "cost_head" text;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "calculation_type" text NOT NULL DEFAULT 'RATE_BOOK';
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "confidence" text;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "pct" double precision;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "basis_selector" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "component_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_estimate_item" ADD COLUMN IF NOT EXISTS "estimate_component_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_rate_analysis" ADD COLUMN IF NOT EXISTS "component_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_component" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "level" text NOT NULL,
  "discipline" text NOT NULL,
  "component_type" text NOT NULL,
  "uom" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'PHYSICAL',
  "formula_key" text NOT NULL,
  "param_schema" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "rate_source" text NOT NULL DEFAULT 'RATE_BOOK',
  "dsr_item_id" uuid REFERENCES "esti_dsr_item"("id"),
  "rate_analysis_id" uuid REFERENCES "esti_rate_analysis"("id"),
  "project_id" uuid REFERENCES "esti_projectoffice"("id"),
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_ifc_mapping" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ifc_entity" text NOT NULL,
  "predefined_type" text,
  "component_id" uuid NOT NULL REFERENCES "esti_component"("id") ON DELETE CASCADE,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_component_related" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_component_id" uuid NOT NULL REFERENCES "esti_component"("id") ON DELETE CASCADE,
  "child_component_id" uuid NOT NULL REFERENCES "esti_component"("id") ON DELETE CASCADE,
  "ratio_formula_key" text,
  "qty_factor" double precision NOT NULL DEFAULT 1,
  "sequence" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_estimate_component" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "estimate_id" uuid NOT NULL REFERENCES "esti_estimate"("id") ON DELETE CASCADE,
  "component_id" uuid NOT NULL REFERENCES "esti_component"("id"),
  "design_item_id" uuid REFERENCES "esti_estimate_item"("id"),
  "params" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "qty_formula_key" text NOT NULL,
  "computed_qty" double precision NOT NULL DEFAULT 0,
  "uom" text NOT NULL,
  "cost_head" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_estimate_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "estimate_id" uuid NOT NULL REFERENCES "esti_estimate"("id") ON DELETE CASCADE,
  "version_no" integer NOT NULL,
  "stage" text NOT NULL,
  "status" text NOT NULL,
  "subtotal_paise" bigint NOT NULL DEFAULT 0,
  "total_paise" bigint NOT NULL DEFAULT 0,
  "snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "note" text,
  "frozen_by" uuid REFERENCES "esti_user"("id"),
  "frozen_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_estimate_item_component_id_fk') THEN
    ALTER TABLE "esti_estimate_item" ADD CONSTRAINT "esti_estimate_item_component_id_fk"
      FOREIGN KEY ("component_id") REFERENCES "esti_component"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_estimate_item_estimate_component_id_fk') THEN
    ALTER TABLE "esti_estimate_item" ADD CONSTRAINT "esti_estimate_item_estimate_component_id_fk"
      FOREIGN KEY ("estimate_component_id") REFERENCES "esti_estimate_component"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_rate_analysis_component_id_fk') THEN
    ALTER TABLE "esti_rate_analysis" ADD CONSTRAINT "esti_rate_analysis_component_id_fk"
      FOREIGN KEY ("component_id") REFERENCES "esti_component"("id");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_estimate_component_estimate_idx" ON "esti_estimate_component" ("estimate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_ifc_mapping_component_idx" ON "esti_ifc_mapping" ("component_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_estimate_version_estimate_idx" ON "esti_estimate_version" ("estimate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_estimate_item_component_idx" ON "esti_estimate_item" ("component_id");
