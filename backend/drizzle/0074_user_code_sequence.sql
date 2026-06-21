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

-- Advance the sequence past the highest code already in the table so the
-- next auto value doesn't collide with existing rows.
SELECT setval(
  'esti_user_code_seq',
  COALESCE(
    (SELECT MAX(CAST(SUBSTRING(user_code FROM 4) AS INTEGER))
       FROM esti_user
      WHERE user_code ~ '^USR\d+$'),
    0
  )
);

ALTER TABLE "esti_user"
  ALTER COLUMN "user_code"
  SET DEFAULT ('USR' || LPAD(nextval('esti_user_code_seq')::text, 3, '0'));
