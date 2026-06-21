-- Migration 0074: auto-generate user_code via a Postgres sequence.
-- Migration 0070 set user_code NOT NULL after backfilling existing rows,
-- but did not add a DEFAULT, causing all subsequent inserts (seed scripts,
-- create-user mutation, portal user creation) to fail with a NOT NULL violation.
--
-- This migration:
--   1. Creates a sequence starting after the highest existing numeric code.
--   2. Sets user_code DEFAULT to 'USR' || zero-padded nextval — so any INSERT
--      that omits user_code gets an auto-assigned code like USR004, USR005 …
--   3. Leaves all existing user_code values unchanged.

CREATE SEQUENCE IF NOT EXISTS esti_user_code_seq START 1;

-- Advance the sequence past the highest existing numeric code so new inserts
-- don't collide. Only call setval when rows already exist; on a fresh DB the
-- sequence stays at 1 (its default start).
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT MAX(CAST(SUBSTRING(user_code FROM 4) AS INTEGER))
    INTO max_num
    FROM esti_user
   WHERE user_code ~ '^USR\d+$';
  IF max_num IS NOT NULL AND max_num >= 1 THEN
    PERFORM setval('esti_user_code_seq', max_num);
  END IF;
END $$;

ALTER TABLE "esti_user"
  ALTER COLUMN "user_code"
  SET DEFAULT ('USR' || LPAD(nextval('esti_user_code_seq')::text, 3, '0'));
