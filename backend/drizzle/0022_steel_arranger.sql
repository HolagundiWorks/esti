-- SteelFlow AI: Interactive Steel Arranger + Automated BBS Generator
-- Tables: sf_sessions, sf_elements, sf_rebars, sf_stirrups

CREATE TABLE IF NOT EXISTS "sf_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "project_id" uuid,
  "created_by_id" uuid REFERENCES "esti_user"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sf_elements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sf_sessions"("id") ON DELETE CASCADE,
  "element_type" text NOT NULL,
  "element_code" text NOT NULL,
  "length_mm" integer NOT NULL,
  "width_mm" integer NOT NULL,
  "depth_mm" integer NOT NULL,
  "cover_mm" integer NOT NULL DEFAULT 25,
  "fck" integer NOT NULL DEFAULT 25,
  "fy" integer NOT NULL DEFAULT 500,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sf_rebars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "element_id" uuid NOT NULL REFERENCES "sf_elements"("id") ON DELETE CASCADE,
  "bar_mark" text NOT NULL,
  "dia_mm" integer NOT NULL,
  "bar_type" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "cutting_length_mm" integer,
  "shape_code" text NOT NULL DEFAULT 'A',
  "pos_x" double precision,
  "pos_y" double precision,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sf_stirrups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "element_id" uuid NOT NULL REFERENCES "sf_elements"("id") ON DELETE CASCADE,
  "dia_mm" integer NOT NULL,
  "stirrup_type" text NOT NULL DEFAULT 'CLOSED',
  "spacing_mm" integer NOT NULL,
  "hook_angle" integer NOT NULL DEFAULT 135,
  "hook_length_mm" integer,
  "zone" text NOT NULL DEFAULT 'FULL',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "sf_elements_session_idx" ON "sf_elements"("session_id");
CREATE INDEX IF NOT EXISTS "sf_rebars_element_idx" ON "sf_rebars"("element_id");
CREATE INDEX IF NOT EXISTS "sf_stirrups_element_idx" ON "sf_stirrups"("element_id");
CREATE INDEX IF NOT EXISTS "sf_sessions_created_by_idx" ON "sf_sessions"("created_by_id");
