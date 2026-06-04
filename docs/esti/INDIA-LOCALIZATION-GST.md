# India Localization and GST Direction

## Localization Scope

ESTI ERP is intended as India-focused generic construction software. The default
distribution should support Indian languages only.

Initial language set:

- `en_IN`
- `hi_IN`
- `bn_IN`
- `kn_IN`

Additional Indian languages can be added after translation ownership is clear.
Do not delete upstream language folders early in the fork. First disable
selection through configuration or install profile, then remove unused locales
only after upgrade and installer impact is tested.

## Regional Defaults

- Country: India.
- Currency: INR.
- Timezone: Asia/Kolkata.
- Date and number formats: Indian business defaults.
- Fiscal year: configurable, with Indian defaults.
- Measurement: metric units, construction-friendly unit dictionaries.

## GST Requirements

ESTI should support:

- GSTIN validation and storage for company, customers, suppliers, and sites.
- HSN/SAC codes on products, services, BOQ items, and invoice lines.
- CGST, SGST, IGST, cess, RCM, TDS, and TCS where applicable.
- Place-of-supply logic for intra-state and inter-state transactions.
- GST-ready invoice, credit note, debit note, supplier bill, and purchase order
  documents.
- GST reporting exports for review and future filing integrations.
- E-invoice and e-way-bill integration readiness through extension modules.

## GST and Multi-Currency Policy

Dolibarr stores the primary sales tax in legacy `tva_*` fields and keeps
CGST/SGST in `localtax1/localtax2` for India. ESTI uses those internal fields
only as compatibility storage. The product, setup, documents, and reports must
present the system as GST.

- Enable GST in the ESTI default profile.
- Enable CGST and SGST for same-state India transactions.
- Use IGST for inter-state India transactions through the existing `I-*` tax
  codes.
- Disable VAT-oriented labels and setup paths in the ESTI default profile.
- Replace user-facing tax terminology with GST where the workflow is India-only.
- Keep internal compatibility until all dependent invoices, accounting exports,
  and reports are tested.
- Disable multi-currency by default and keep INR as the only active currency for
  the first release.
- Avoid deleting upstream VAT or currency code until an upgrade-safe removal plan
  is approved.

## Construction-Specific Localization

- Site address and project location should support state, district, city, PIN,
  and optional GPS coordinates.
- Labour workflows should support daily wage, piece-rate, subcontractor, muster,
  and attendance concepts.
- Estimation templates should support common Indian construction units such as
  cum, sqm, sqft, rmt, kg, tonne, bag, brass, nos, day, and hour.
- BOQ documents should support item number, description, unit, quantity, rate,
  amount, GST classification, and revision history.
