ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "user_code" text;
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "designation" text;
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "photo_key" text;

-- Back-fill any rows that have no code yet (safe to run multiple times).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM esti_user
  WHERE user_code IS NULL
)
UPDATE esti_user SET user_code = 'USR' || LPAD(ranked.rn::text, 3, '0')
FROM ranked WHERE esti_user.id = ranked.id;

DO $$ BEGIN
  ALTER TABLE "esti_user" ALTER COLUMN "user_code" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "esti_user" ADD CONSTRAINT "esti_user_user_code_unique" UNIQUE("user_code");
EXCEPTION WHEN OTHERS THEN NULL; END $$;
