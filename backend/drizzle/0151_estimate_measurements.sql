-- Estimate measurements become a first-class table: one row per recorded
-- column of a line's sheet (opened by the single Enter). Any JSONB
-- measurements captured under 0150 are migrated in, then the column drops.
-- Idempotent.
CREATE TABLE IF NOT EXISTS "esti_estimate_measurement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "line_id" uuid NOT NULL REFERENCES "esti_estimate_line"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "label" text,
  "nos" double precision NOT NULL DEFAULT 0,
  "l" double precision,
  "b" double precision,
  "h" double precision,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "esti_estimate_measurement_line_idx"
  ON "esti_estimate_measurement" ("line_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'esti_estimate_line' AND column_name = 'measurements'
  ) THEN
    INSERT INTO "esti_estimate_measurement" ("line_id", "sort_order", "nos", "l", "b", "h")
    SELECT
      el."id",
      m.ord::integer,
      COALESCE((m.val ->> 'nos')::double precision, 0),
      (m.val ->> 'l')::double precision,
      (m.val ->> 'b')::double precision,
      (m.val ->> 'h')::double precision
    FROM "esti_estimate_line" el,
         LATERAL jsonb_array_elements(el."measurements") WITH ORDINALITY AS m(val, ord);

    ALTER TABLE "esti_estimate_line" DROP COLUMN "measurements";
  END IF;
END $$;
