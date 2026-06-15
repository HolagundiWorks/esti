-- Knowledge Bank: versioned specification catalogue (material schedule rows).
CREATE TABLE IF NOT EXISTS "esti_spec_catalog_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" text NOT NULL UNIQUE,
  "description" text,
  "active" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_spec_catalog_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version_id" uuid NOT NULL REFERENCES "esti_spec_catalog_version"("id") ON DELETE CASCADE,
  "category" text,
  "item" text NOT NULL,
  "make" text,
  "specification" text,
  "finish" text,
  "remarks" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_spec_catalog_item_version_idx"
  ON "esti_spec_catalog_item" ("version_id", "sort_order");
--> statement-breakpoint
ALTER TABLE "esti_specitem" ADD COLUMN IF NOT EXISTS "catalog_item_id" uuid
  REFERENCES "esti_spec_catalog_item"("id") ON DELETE SET NULL;
