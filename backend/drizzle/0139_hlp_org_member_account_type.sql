-- AORMS Identity U-3b — the account-type unification's central-schema slice. A
-- hub membership now also carries the linked esti_user's unified `type`
-- (STAFF/COMPANY/CLIENT/CONSULTANT/CONTRACTOR), kept in sync from each node via
-- POST /platform/v1/sync-membership. Additive; existing memberships are simply
-- untyped until a node syncs one.
ALTER TABLE "hlp_org_member" ADD COLUMN IF NOT EXISTS "account_type" text;
