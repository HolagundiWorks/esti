-- Migration 0140: EX_USER public IDs
-- Adds a human-readable portable ID (AORMS-X-XXXX) to every external-party
-- table: clients (CLIENT portal users), contractors (CONTRACTOR portal users),
-- and vendors (EX_USER / supplier records).
-- The AORMS-X- prefix identifies external parties; AORMS-U- is reserved for
-- internal staff personal identities (hlp_account / esti_user.accountPublicId).
-- IDs are generated at record-creation time by the backend; existing rows are
-- left NULL and backfilled lazily on first edit or via a one-off script.

ALTER TABLE esti_client
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

ALTER TABLE esti_contractor
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

ALTER TABLE esti_vendor
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
