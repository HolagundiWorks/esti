-- GST review follow-up — record the place of supply on the invoice.
--
-- Rule 46(n) requires the place of supply along with the State name on every
-- inter-state invoice. The value was never captured: `inter_state` was a bare
-- checkbox and the state it implied was nowhere on the record, so an IGST
-- invoice could not be reconciled to GSTR-1 table 5/4B.
--
-- Derived from the project's site state under IGST Act s.12(3)(a) at the time
-- the invoice is raised, and stored alongside the rest of the tax snapshot so a
-- later change to the project or client cannot restate an issued document.
ALTER TABLE esti_invoice
  ADD COLUMN IF NOT EXISTS place_of_supply_state text;
