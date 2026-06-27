-- RuleSet-driven Estimation OS (Phase 2): extend the component master into a
-- versioned RuleSet/work-item with free-form quantity formula, BOQ splitters,
-- material splitters; and add a free-form dependency-mapping formula on the
-- dependency edge. Additive + idempotent.

ALTER TABLE "esti_component"
  ADD COLUMN IF NOT EXISTS "quantity_formula" text,
  ADD COLUMN IF NOT EXISTS "boq_splitters" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "material_splitters" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "version" text DEFAULT '1.0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "lifecycle" text DEFAULT 'DRAFT' NOT NULL,
  ADD COLUMN IF NOT EXISTS "parent_version_id" uuid;

ALTER TABLE "esti_component_related"
  ADD COLUMN IF NOT EXISTS "quantity_formula" text;

-- Existing components are already in use → treat them as published RuleSets so
-- the execution engine (which loads PUBLISHED rulesets) keeps working.
UPDATE "esti_component" SET "lifecycle" = 'PUBLISHED' WHERE "status" = 'ACTIVE';
