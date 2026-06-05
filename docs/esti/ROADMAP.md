# ESTI Product Roadmap

This roadmap is the public ESTI direction for the Indian construction ERP fork.
Operational links for releases, updates, issues, and documentation should point
to the ESTI repository:

```text
https://github.com/HolagundiWorks/esti
```

## 0. Fork Foundation — DONE

- Preserve GPL notices and upstream attribution required for redistributed
  Dolibarr-derived code.
- Replace public-facing product links with ESTI repository links.
- Disable the remote module marketplace and upstream module feeds.
- Remove non-construction module descriptors from backend discovery.
- Keep upstream compatibility notes for engineering only.
- Podman development runtime, installer defaults, and post-install ESTI
  defaults in place.

Current status: the ESTI backend profile removes the module descriptors for CRM,
proposals, orders, stock/warehouse, POS, ecommerce, subscriptions, donations,
members, HR, recruitment, expenses, MRP, helpdesk, email campaigns, surveys,
shipping, events, interventions, knowledge base, generic product management,
generic services, product variants, projects/collaboration, ECM, barcodes,
multi-currency, and subtotals. Legacy routes return `410 Gone`. Retained
source directories are compatibility boundaries until hard includes, menus,
permissions, and upgrade paths are audited.

## 1. India Operating Baseline — DONE

- Default country, currency, timezone, and language profile set to India.
- Language selection restricted to Indian locales shipped in the fork.
- INR and GST set as the default finance vocabulary and tax profile.
- CGST, SGST, and IGST enabled in the ESTI default profile.
- Global currency and non-Indian tax choices disabled by configuration.

## 2. Construction Core — In Progress

`esti_dsrsor` is the first live construction module. It is scaffolded and
operational with XLSX/XLS/ODS/CSV import, audit tracking, item list with
search/filter, item card view, admin setup, and a dashboard showing live stats.

Remaining modules to build in implementation order:

1. `esti_projectsite` — construction project, site, work package, cost-centre,
   and client/consultant/subcontractor records.
2. `esti_rateanalysis` — material, labour, machinery, overhead, wastage,
   carriage, lead, lift, royalty, contractor margin, GST-aware rate buildup
   with formula engine and approval workflow.
3. `esti_estimation` — project estimates, revisions, approvals, locked versions,
   and full audit history.
4. `esti_boq` — BOQ sections, line items, versioning, variation tracking, client
   versus internal BOQ, and links to billing and purchase.
5. `esti_billing` — RA bills, measurement book, advances, retention, deductions,
   recoveries, and GST-ready invoice documents.
6. `esti_labour` — labour teams, attendance, muster, and wage calculation.
7. `esti_sitestock` — site stores, material issue/return/transfer/wastage, and
   BOQ-linked consumption.
8. `esti_purchase` — purchase requisitions, supplier quotations, purchase
   orders, GRN, and supplier bills.
9. Lead/lift calculator — quarry/source mapping, distance, lead and lift
   statements, and carriage cost sheet.
10. GST reporting exports — GSTR-ready output for review and future filing.

Use Dolibarr `CommonObject`, hooks, permissions, and `llx_` table conventions
throughout.

## 3. Contractor Operations — Planned

- RA bills, final bills, retention, advances, deductions, debit/credit notes,
  and GST-ready invoices.
- Measurement book entries with previous, current, cumulative, and certified
  quantities.
- Labour cess, royalty, TDS, GST, advance recovery, and final payable.
- Labour teams, subcontractors, attendance, work orders, and wage sheets.
- Site stock, purchase requisitions, purchase orders, GRN, issue, return,
  transfer, wastage, and reconciliation.
- Project cost control by site, package, BOQ item, supplier, subcontractor,
  and billing milestone.
- Lead and lift calculations with quarry/source mapping, site mapping,
  transport mode, lead statements, lift statements, and carriage cost sheets.

## 4. ESTI UI — In Progress

- Carbon-inspired theme with IBM blue and light/dark modes is operational.
- React shell at `/estiui/` shows module cards with live status indicators.
- DSR/SOR library is the first module with an active link from the dashboard.
- Remaining workflow screens (rate analysis, estimation, BOQ, billing, etc.)
  are planned for Carbon/React migration after PHP scaffolds are complete.
- Disable user theme marketplace and customization paths in the ESTI
  distribution profile.

## 5. Release Hardening — Planned

- Validate create, edit, delete, permissions, multi-entity behaviour, and audit
  logs for every ESTI module.
- Review dormant upstream marketplace source for deletion only after installer,
  module deployment, upgrade, and security checks pass.
- Continue pruning stale menus, permissions, dictionaries, API surfaces, and
  document templates for modules already removed from ESTI discovery.
- Add PHPUnit coverage for construction object classes and GST calculations.
- Publish release notes, source code, container metadata, security policy, and
  migration notes from the ESTI repository.
- Keep Dolibarr references only where they identify upstream-derived code,
  copyrights, GPL obligations, compatibility APIs, or merge procedures.
