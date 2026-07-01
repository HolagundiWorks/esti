-- AORMS Identity I-1 — portable public ids: AORMS-U-XXXX on accounts (the
-- person's portable identity) and AORMS-C-XXXX on organizations (the company
-- handle used for Step-1 tenant-first login). Additive + backfilled; existing
-- logins are untouched.
ALTER TABLE "hlp_account" ADD COLUMN IF NOT EXISTS "public_id" text;
ALTER TABLE "hlp_organization" ADD COLUMN IF NOT EXISTS "public_id" text;

-- Backfill existing rows with a unique Crockford base32 handle (no ambiguous
-- I/L/O/U). Loops until the generated code is unique within its table.
DO $$
DECLARE
  r record;
  code text;
  i int;
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
BEGIN
  FOR r IN SELECT id FROM hlp_account WHERE public_id IS NULL LOOP
    LOOP
      code := 'AORMS-U-';
      FOR i IN 1..6 LOOP
        code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM hlp_account WHERE public_id = code);
    END LOOP;
    UPDATE hlp_account SET public_id = code WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM hlp_organization WHERE public_id IS NULL LOOP
    LOOP
      code := 'AORMS-C-';
      FOR i IN 1..6 LOOP
        code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM hlp_organization WHERE public_id = code);
    END LOOP;
    UPDATE hlp_organization SET public_id = code WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "hlp_account_public_id_idx" ON "hlp_account" ("public_id");
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_organization_public_id_idx" ON "hlp_organization" ("public_id");
