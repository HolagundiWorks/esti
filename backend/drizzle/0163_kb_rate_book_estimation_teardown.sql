-- Rate Book (new office schedule-of-rates reference table).
CREATE TABLE IF NOT EXISTS "esti_rate_book" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "notes" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Estimation OS teardown: drop the standalone estimate tables (FK-safe order).
-- The KB material/labour/spec tables are intentionally KEPT (the CMS uses them).
DROP TABLE IF EXISTS "esti_estimate_measurement" CASCADE;
DROP TABLE IF EXISTS "esti_estimate_line" CASCADE;
DROP TABLE IF EXISTS "esti_estimate" CASCADE;
