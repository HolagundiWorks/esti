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
- Keep upstream compatibility notes for engineering only, so security patches can
  be reviewed and merged without confusing ESTI users.
- Finish Podman development runtime, installer defaults, and post-install ESTI
  defaults.

## 1. India Operating Baseline

- Default country, currency, timezone, and language profile to India.
- Restrict ESTI-supported languages to Indian locales shipped in the fork.
- Set INR and GST as the default finance vocabulary.
- Disable global currency, non-Indian tax, and unrelated localization choices by
  configuration before removing code.

## 2. Construction Core

- Build `esti_rateanalysis` for material, labour, machinery, overhead, wastage,
  contractor margin, and GST-aware rate buildup.
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
- Add PHPUnit coverage for construction object classes and GST calculations.
- Publish release notes, source code, container metadata, security policy, and
  migration notes from the ESTI repository.
- Keep Dolibarr references only where they identify upstream-derived code,
  copyrights, GPL obligations, compatibility APIs, or merge procedures.
