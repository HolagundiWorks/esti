-- 0213 — P7: platform-side usage reports from product nodes.
-- Prerequisite for multi-tenant metered billing (P7.2); no Stripe/invoice logic.
CREATE TABLE IF NOT EXISTS hlp_usage_report (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES hlp_organization(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES hlp_product(id) ON DELETE CASCADE,
  -- First calendar day of the reported month (UTC), e.g. 2026-07-01.
  period_start date NOT NULL,
  storage_used_bytes bigint NOT NULL DEFAULT 0,
  storage_quota_bytes bigint NOT NULL DEFAULT 0,
  storage_purchased_bytes bigint NOT NULL DEFAULT 0,
  ai_tokens_this_month integer NOT NULL DEFAULT 0,
  reported_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hlp_usage_report_org_product_period_idx
  ON hlp_usage_report(org_id, product_id, period_start);
CREATE INDEX IF NOT EXISTS hlp_usage_report_period_idx
  ON hlp_usage_report(period_start);
