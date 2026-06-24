-- Contractor portal login: add a contractor link on the user (role CONTRACTOR).
-- Mirrors clientId (CLIENT portal) and consultantId (CONSULTANT collaborator).
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "contractor_id" uuid;
