# ESTI Construction Modules

## Module Architecture

ESTI modules should follow Dolibarr's module structure:

```text
htdocs/esti_module/
  admin/
  class/
  core/
  lib/
  sql/
  tpl/
```

Use `htdocs/modulebuilder/template` as the implementation reference. Prefer
hooks, `CommonObject`, and Dolibarr database APIs before modifying core code.

## Core Modules

### Rate Analysis

- Material, labour, machinery, subcontract, overhead, and profit components.
- Standard schedule item library.
- Rate build-up by unit and project/site.
- Revision history and approval status.

### Estimation

- Project estimate header with customer, site, scope, revision, and validity.
- Estimate lines linked to rate analysis items and BOQ items.
- Abstract, detailed, and comparison views.
- Exportable estimate documents.

### BOQ

- BOQ sections, groups, line items, units, quantities, rates, and amounts.
- Versioning, locked revisions, and change notes.
- Links to estimate, purchase, stock issue, and billing workflows.
- Support for work packages and subcontract packages.

### Billing

- RA bills, final bills, advances, retention, deductions, and recoveries.
- Measurement book references and certified quantity tracking.
- GST-ready invoice documents.
- Customer and subcontractor billing variants.

### Labour Team Management

- Labour teams, contractors, roles, attendance, wage types, and site allocation.
- Daily muster and wage calculation.
- Labour cost posting to project and BOQ packages.

### Site Stock

- Site-wise stock, material issue, return, transfer, wastage, and reconciliation.
- Link material consumption to BOQ and work package.
- Implement this as an ESTI construction site-store module. The generic upstream
  stock/warehouse module descriptor is removed from ESTI discovery and must not
  be re-enabled as the primary workflow.

### Purchase Orders

- Purchase requisitions by site or BOQ item.
- Supplier quotations and comparison.
- Purchase orders, GRN, supplier bills, and rate history.
- Budget checks against estimate and BOQ allocations.

## Data Model Guardrails

- All new database tables must use the `llx_` prefix.
- Store entity information for multi-company compatibility.
- Avoid SQL queries inside loops; use joins or batched queries.
- Keep permissions explicit in each `modEsti*.class.php`.
- Add list query limits and indexes for project, site, status, and entity fields.

## First Implementation Order

1. ESTI project/site metadata.
2. Rate analysis.
3. Estimation.
4. BOQ.
5. Billing.
6. Purchase and site-store links.
7. Labour team management.
8. GST reporting exports.
