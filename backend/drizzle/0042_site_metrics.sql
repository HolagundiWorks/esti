-- Public marketing metrics (landing page visit counter).
CREATE TABLE IF NOT EXISTS "esti_site_metrics" (
  "key" text PRIMARY KEY,
  "value" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "esti_site_metrics" ("key", "value")
VALUES ('landing_visits', 0)
ON CONFLICT ("key") DO NOTHING;
