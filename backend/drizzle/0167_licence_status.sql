-- 2026-07 product pivot: single licence status (ACTIVE / SUSPENDED).
-- All existing firms migrate to ACTIVE (full feature access).
-- The legacy `plan` column is kept for back-compat during transition.

ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "licence_status" text NOT NULL DEFAULT 'ACTIVE';

UPDATE "esti_orgsettings"
  SET "licence_status" = 'ACTIVE'
  WHERE "licence_status" IS DISTINCT FROM 'ACTIVE';

-- Also set default storage quota to 5 GiB for firms that have 0 purchased bytes
-- and are currently under the old 10 GiB Pro cap.
-- (New accounts will get DEFAULT_STORAGE_BYTES via the application layer.)
