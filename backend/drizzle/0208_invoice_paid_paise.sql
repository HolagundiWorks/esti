-- Reconciliation review follow-up — track how much of an invoice is actually paid.
--
-- Settlement used to flip an invoice to PAID whenever a bank line matched it by
-- reference, with no regard for the amount received: a partial payment marked
-- the whole invoice PAID and the balance vanished from every receivables view.
--
-- `paid_paise` accumulates receipts so an invoice only becomes PAID once the
-- amount received covers its net receivable; anything less leaves it ISSUED and
-- partly paid. Existing PAID invoices are backfilled to their net receivable so
-- they are treated as fully settled rather than newly under-paid.
ALTER TABLE esti_invoice
  ADD COLUMN IF NOT EXISTS paid_paise bigint NOT NULL DEFAULT 0;

UPDATE esti_invoice
   SET paid_paise = net_receivable_paise
 WHERE status = 'PAID' AND paid_paise = 0;
