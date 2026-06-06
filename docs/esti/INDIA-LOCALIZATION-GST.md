# India Localization, GST, And TDS Direction

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for
> GST / TDS / India tax policy — other documents reference this rather than
> restating tax rules._

## Localization Scope

ESTI is an India-focused architecture office management platform. The default
distribution should support Indian practice workflows, Indian tax vocabulary,
and Indian language packs that are actively maintained.

Initial language set:

- `en_IN`
- `hi_IN`
- `bn_IN`
- `kn_IN`
- `ta_IN`

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
- Measurement: metric units, with optional architecture/construction unit
  dictionaries for BOQ and drawing takeoff support.

## Architecture Service Tax Requirements

ESTI should support:

- GSTIN validation and storage for company, clients, consultants, and suppliers.
- SAC codes on fee proposal lines, invoice lines, and consultant services.
- Default architectural services SAC `998311`.
- CGST, SGST, IGST, cess where applicable, RCM where applicable, and TDS/TCS
  tracking where applicable.
- Place-of-supply logic for intra-state and inter-state transactions.
- GST-ready invoice, credit note, debit note, receipt, and consultant/supplier
  documents.
- TDS u/s 194J tracking on professional fee invoices, including pending
  certificate/reconciliation state.
- GST and TDS reporting exports for accountant review and future filing
  integrations.

## Supporting Costing And Construction References

Architecture workflows may still need costing support for BOQs, tender
documents, PMC/turnkey work, or drawing takeoff. For those supporting workflows,
ESTI may also store:

- HSN/SAC codes on BOQ/support line items.
- Labour cess, royalty, and statutory deductions as optional cost components.
- Clear separation between taxable value, GST, deductions, recoveries, and final
  payable amounts where a contractor-style support document is produced.

These are supporting capabilities, not the primary first-release product scope.

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

## Architecture Office Localization

- Project addresses should support state, district, city, PIN, and optional GPS
  coordinates.
- Jurisdiction should support authorities such as BBMP, BDA, Panchayat, HMDA,
  CMDA, and other local bodies.
- Permit workflows should support authority, application number, submitted date,
  due date, approval date, document checklist, and portal link.
- Fee proposal templates should support scope, deliverables, exclusions,
  revision number, validity, payment schedule, GST, and TDS notes.
- Drawing documents should support drawing number, discipline, revision, issue
  purpose, watermark, issue date, recipient, and approval state.
- BOQ/takeoff support should include item number, description, unit, quantity,
  rate, amount, GST classification, and revision history.
