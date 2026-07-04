-- Community edition: a one-time backup recovery code (hashed) for offline
-- password recovery — the only recovery path when there is no email/online.
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "backup_code_hash" text;
