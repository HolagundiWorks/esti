-- BYOS — bring-your-own-storage (Core+). Per-firm storage target (NAS / S3).
-- See StorageSettings in @esti/contracts. The s3 secret is stored here but never
-- returned by read APIs.
ALTER TABLE esti_orgsettings
  ADD COLUMN storage_settings jsonb NOT NULL DEFAULT '{"mode":"DEFAULT"}';
