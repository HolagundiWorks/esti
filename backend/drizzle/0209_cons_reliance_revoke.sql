-- Reliance letters — active revocation (review policy call, 2026-07-21).
--
-- A reliance letter is a legal instrument given to a third-party beneficiary.
-- It was already non-deletable; the only corrections were superseding it or
-- letting an expiry pass. Firms genuinely need to *withdraw* reliance (the
-- relationship ends, the work is superseded, it was issued in error, or an
-- insurer demands it). These columns record that withdrawal without erasing the
-- row: the letter stays on record permanently, stamped REVOKED with who/when/why.
--
-- Nullable by design: existing rows are LIVE (or EXPIRED via expires_on). The
-- mandatory-expiry rule for *new* letters is enforced at the contract layer, so
-- expires_on stays nullable here to leave legacy rows intact.
ALTER TABLE esti_cons_reliance_letter
  ADD COLUMN IF NOT EXISTS revoked_at timestamp,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_by_name text,
  ADD COLUMN IF NOT EXISTS revoke_reason text;
