-- Staff attendance register (replaces timesheets / stand-up in the product).
CREATE TABLE IF NOT EXISTS "esti_attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_member_id" uuid NOT NULL REFERENCES "esti_teammember"("id") ON DELETE CASCADE,
  "attendance_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'PRESENT',
  "notes" text,
  "marked_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_attendance_member_date_uq"
  ON "esti_attendance" ("team_member_id", "attendance_date");

CREATE INDEX IF NOT EXISTS "esti_attendance_date_idx"
  ON "esti_attendance" ("attendance_date" DESC);
