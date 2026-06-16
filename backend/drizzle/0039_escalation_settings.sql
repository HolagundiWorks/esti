-- Phase 5: configurable escalation rules + leave backup contacts
ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "escalation_settings" jsonb NOT NULL DEFAULT '{"staleApprovalDays":7,"followUpLeadDays":0,"taskOverdueDays":3,"digestEnabled":true,"leaveHorizonDays":7}';

ALTER TABLE "esti_teammember"
  ADD COLUMN IF NOT EXISTS "backup_contact_name" text,
  ADD COLUMN IF NOT EXISTS "backup_contact_phone" text;
