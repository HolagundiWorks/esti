-- Optional org binding for product API keys. When set, a key may only act for
-- its own organization on the identity endpoints (/v1/verify-identity,
-- /v1/sync-membership) — closing a gap where any holder of a product-wide key
-- could read or mutate another customer's membership by asserting a different
-- AORMS-C/AORMS-U handle. Nullable/additive: existing keys stay product-wide
-- (legacy behaviour) until an admin re-issues them bound to an org.
ALTER TABLE "hlp_api_key" ADD COLUMN IF NOT EXISTS "org_id" text REFERENCES "hlp_organization"("id");
