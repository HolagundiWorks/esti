# ESTI Product Roadmap

This roadmap is the public ESTI direction for the Indian construction ERP fork.
Operational links for releases, updates, issues, and documentation should point
to the ESTI repository:

```text
https://github.com/HolagundiWorks/esti
```

## 0. Fork Foundation

- Preserve GPL notices and upstream attribution required for redistributed
  Dolibarr-derived code.
- Replace public-facing product links with ESTI repository links.
- Disable the remote module marketplace and upstream module feeds in the ESTI
  runtime before deleting dormant compatibility code.
- Remove non-construction module descriptors from backend discovery after a
  compatibility review.
- Keep upstream compatibility notes for engineering only, so security patches can
  be reviewed and merged without confusing ESTI users.
- Finish Podman development runtime, installer defaults, and post-install ESTI
  defaults.

Current status: the ESTI backend profile removes the module descriptors for CRM,
proposals, orders, stock/warehouse, POS, ecommerce, subscriptions, donations,
members, HR, recruitment, expenses, MRP, helpdesk, email campaigns, surveys,
shipping, events, interventions, knowledge base, generic product management,
generic services, product variants, projects/collaboration, ECM, barcodes,
multi-currency, and subtotals. Legacy routes now return `410 Gone`; retained
source directories are compatibility boundaries until hard includes, menus,
permissions, and upgrade paths are audited.

## 1. India Operating Baseline

- Default country, currency, timezone, and language profile to India.
- Restrict ESTI-supported languages to Indian locales shipped in the fork.
- Set INR and GST as the default finance vocabulary and tax profile.
- Present GST, GSTIN, CGST, SGST, and IGST in India-facing screens while keeping
  legacy Dolibarr tax storage compatible.
- Disable global currency, non-Indian tax, and unrelated localization choices by
  configuration before removing code.

## 2. Construction Core

- Build `esti_rateanalysis` for material, labour, machinery, overhead, wastage,
  contractor margin, and GST-aware rate buildup.
- Build `esti_projectsite` for India construction project/site metadata, work
  packages, cost centres, locations, and operational ownership.
- Build `esti_estimation` for project estimates, revisions, approvals, and
  quantity takeoff.
- Build `esti_boq` for BOQ packages, work items, schedules, comparison, and
  downstream billing links.
- Use Dolibarr `CommonObject`, hooks, permissions, and `llx_` table conventions.

## 3. Contractor Operations

- RA bills, final bills, retention, advances, deductions, debit/credit notes, and
  GST-ready invoices.
- Labour teams, subcontractors, attendance, work orders, and wage sheets.
- Site stock, purchase requisitions, purchase orders, GRN, issue, return,
  transfer, wastage, and reconciliation.
- Project cost control by site, package, BOQ item, supplier, subcontractor, and
  billing milestone.

## 4. ESTI UI

- Move toward Carbon-inspired layouts, IBM blue, and light/dark modes only.
- Disable user theme marketplace/customization paths in the ESTI distribution
  profile.
- Keep ERP screens dense, scannable, and workflow-first.
- Redesign using theme/templates before core rewrites.

## 5. Release Hardening

- Validate create, edit, delete, permissions, multi-entity behavior, and audit
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
