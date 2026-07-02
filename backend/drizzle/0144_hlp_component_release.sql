-- Published desktop component sets per edition — what the Manager downloads and
-- verifies. The build pipeline publishes a row per (edition, app_version) with
-- each artifact's URL + SHA-256; POST /platform/v1/manifest serves the latest
-- active row for the caller's edition, signed with the licence key.
CREATE TABLE IF NOT EXISTS "hlp_component_release" (
  "id" text PRIMARY KEY,
  "edition" text NOT NULL,
  "app_version" text NOT NULL,
  "components" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "hlp_component_release_edition_active_idx"
  ON "hlp_component_release" ("edition", "active");
