-- 0215 — Link consultancy fee stages to Studio invoices (SOP §8 milestone invoicing).
-- markInvoiced raises a tax invoice document; markPaid syncs PAID on the linked row.
ALTER TABLE esti_cons_fee_stage
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES esti_invoice(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS esti_cons_fee_stage_invoice_uidx
  ON esti_cons_fee_stage(invoice_id)
  WHERE invoice_id IS NOT NULL;
