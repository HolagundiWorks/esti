-- Reusable named teams: a group of office staff that can be staffed onto a project in one action.

CREATE TABLE IF NOT EXISTS "esti_team" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "esti_team_membership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "esti_team"("id") ON DELETE CASCADE,
  "team_member_id" uuid NOT NULL REFERENCES "esti_teammember"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_team_membership_uq"
  ON "esti_team_membership" ("team_id", "team_member_id");
