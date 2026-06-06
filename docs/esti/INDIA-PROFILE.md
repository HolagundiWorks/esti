# ESTI India Profile — Fixed Constants, GST, TDS

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for the
> **hardcoded, non-configurable** India profile and all GST / TDS policy. Other
> documents reference this rather than restating tax rules._

ESTI is single-firm software for one Indian architecture practice. The values
below are **fixed in code, not user-configurable** — there is deliberately no
settings screen to change them. They are validated once, at the data layer and
in the UI, and never exposed as options.

## Fixed Firm Profile

- **One firm only.** No multi-company, no multi-tenant, no tenant column.
- **COA registration number is a mandatory firm Legal ID.** Architecture
  practice in India requires the principal to be registered with the Council of
  Architecture; the COA number is stored as the firm's primary Legal ID and is
  printed on fee proposals, invoices, bills of supply, and document footers.
- **GSTIN and PAN** are stored on the firm (GSTIN required only when the firm
  operates under a GST-registered system — see below).

## Fixed Regional Constants

| Constant | Value (hardcoded) |
|---|---|
| Country | India |
| Currency | **INR only** (₹) — no multi-currency, no currency field |
| Number format | **Indian** grouping — `₹1,23,45,678`; short form "₹1.23 Cr", "₹45.6 L" |
| Timezone | Asia/Kolkata |
| Financial year | **1 April – 31 March** (fixed; all periods, sequences, and reports use this) |
| Date format | `DD-MM-YYYY` |
| Language | English (Indian locale); Indian language packs optional later |

### Indian number formatting (required everywhere)

- Grouping is 3 digits then 2-digit groups: `12,34,567` not `1,234,567`.
- Short display uses crore / lakh / thousand: `₹1.50 Cr`, `₹12.34 L`, `₹45,000`.
- One shared money/format module owns this; no component formats currency ad hoc.
- Money is computed in decimal (paise precision), never floating point — see
  [ARCHITECTURE](ARCHITECTURE.md) ADR (money & rounding).

## GST Systems (exactly one active per firm)

The firm operates under **one** of three GST systems, set once for the firm
(changes only at re-registration, rarely). Each system is a fixed code path; the
rates below are hardcoded.

| # | System | When it applies | Rate | Document issued | ITC |
|---|---|---|---|---|---|
| 1 | **GST Not Applicable** | Aggregate turnover ≤ ₹20 lakh (₹10 lakh in special-category states); firm not GST-registered | none | Plain invoice (no GST) | n/a |
| 2 | **Composition** | Annual billing < ₹40 lakh; registered under composition | **5% flat** on billed value | **Bill of Supply** (GST not collected from client; the 5% is borne by the firm) | **No ITC** |
| 3 | **Regular** | Default for registered service practice | **18%** | **Tax Invoice** | Yes |

Notes:
- **System 1** raises no GST and shows no GST lines; the firm must monitor the
  turnover threshold and switch to a registered system when crossed.
- **System 2 (Composition)** issues a **Bill of Supply**, not a tax invoice; GST
  is **not** charged to the client; the firm pays 5% out of its own receipts;
  no input tax credit; filing is quarterly **CMP-08** + annual **GSTR-4**.
- **System 3 (Regular)** issues a **Tax Invoice**; 18% split as **CGST 9% +
  SGST 9%** intra-state or **IGST 18%** inter-state (place-of-supply driven);
  input tax credit allowed; filing **GSTR-1** + **GSTR-3B**.
- Thresholds and the composition rate reflect the firm's current registration —
  confirm with the firm's CA before each financial year; they are recorded here
  as the product's fixed assumptions.

### SAC codes (Regular system, all 18%)

| SAC | Service | GST |
|---|---|---|
| 998321 | Architectural advisory / consultancy services | 18% |
| 998322 | Architectural services for residential building projects | 18% |
| 998323 | Architectural services for non-residential building projects | 18% |
| 998324 | Historical restoration architectural services | 18% |
| 998325 | Urban planning services | 18% |
| 998327 | Project site master planning services | 18% |
| 998328 | Landscape architectural services and advisory | 18% |
| 998339 | Project management services for construction projects | 18% |

The fee-proposal and invoice line picks the SAC per the work type; default
`998322` for residential, `998323` for non-residential.

## TDS

- **Section 194J** — 10% on professional/architectural fees; the client deducts
  and deposits it.
- ESTI tracks **expected TDS per invoice** and a pending-certificate state, and
  reconciles against **Form 26AS / AIS** at year-end (see the **reconcile
  module** in [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md)).
- TDS receivables are exportable for the CA.

## Place of Supply

- Intra-state (same state as the firm's GSTIN) → CGST + SGST.
- Inter-state → IGST.
- Determined from the client's state vs the firm's registered state; stored on
  the invoice for GSTR-1 reporting.

## Reporting and Reconciliation

- **GSTR-1** (Regular) / **CMP-08 + GSTR-4** (Composition) period exports.
- **TDS / 26AS / AIS** reconciliation.
- Payment/receipt reconciliation against bank statement imports.
- All owned by the **reconcile module**.

## Explicitly Out of Scope

- **e-Way bill** — not applicable (pure professional services, no goods movement).
- **Multi-currency, multi-company, non-India localization.**
- **e-Invoice / IRN / QR** — not built; modelled only as nullable, pluggable
  fields so it can be added later without schema churn (most small practices are
  below the e-invoice turnover threshold).

## Tax Storage (native)

ESTI stores GST natively — taxable value, CGST/SGST/IGST, cess, TDS, SAC, place
of supply, and the active GST system — in its own `esti_invoice` /
`esti_gst_detail` tables. There is no Dolibarr `tva_*`/`localtax*` mapping; the
domain, UI, and documents speak **GST** end to end.
