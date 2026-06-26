-- Phase B hybrid sync (B-SYNC-1). Node outbox + hub per-firm record store. Idempotent.

CREATE TABLE IF NOT EXISTS "esti_sync_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text NOT NULL,
  "op" text DEFAULT 'UPSERT' NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "file_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "state" text DEFAULT 'PENDING' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "remote_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "synced_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "esti_sync_record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firm_id" uuid NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "file_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "esti_sync_record_uniq"
  ON "esti_sync_record" ("firm_id", "entity", "entity_id");
