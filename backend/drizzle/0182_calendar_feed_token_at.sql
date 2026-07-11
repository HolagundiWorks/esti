-- Calendar feed token issuance time — expired tokens are rejected (rotate to renew).
ALTER TABLE "esti_user"
  ADD COLUMN IF NOT EXISTS "calendar_feed_token_at" timestamptz;

UPDATE "esti_user"
SET "calendar_feed_token_at" = NOW()
WHERE "calendar_feed_token" IS NOT NULL
  AND "calendar_feed_token_at" IS NULL;
