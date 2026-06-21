ALTER TABLE esti_user
  ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;
