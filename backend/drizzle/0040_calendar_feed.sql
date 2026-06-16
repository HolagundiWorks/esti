-- Per-user secret token for Google Calendar / iCal subscription (workload tasks).
ALTER TABLE "esti_user"
  ADD COLUMN IF NOT EXISTS "calendar_feed_token" text;

CREATE UNIQUE INDEX IF NOT EXISTS "esti_user_calendar_feed_token_uq"
  ON "esti_user" ("calendar_feed_token")
  WHERE "calendar_feed_token" IS NOT NULL;
