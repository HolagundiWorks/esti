-- One-time workspace profile gate for existing installs upgrading to unified accounts.

ALTER TABLE esti_user
  ADD COLUMN IF NOT EXISTS must_complete_workspace_profile boolean NOT NULL DEFAULT false;

-- Flag existing staff logins (skip demo + external portal roles). New signups stay false.
UPDATE esti_user
SET must_complete_workspace_profile = true
WHERE is_demo = false
  AND disabled = false
  AND role IN (
    'OWNER', 'PARTNER', 'ACCOUNTANT', 'HR_MANAGER',
    'SENIOR', 'ASSOCIATE', 'VIEWER', 'SITE_SUPERVISOR'
  )
  AND consultant_id IS NULL
  AND client_id IS NULL
  AND contractor_id IS NULL;
