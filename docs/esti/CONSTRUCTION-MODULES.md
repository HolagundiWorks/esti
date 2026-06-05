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
The detailed India construction requirements are maintained in
`docs/esti/INDIA-CONSTRUCTION-FEATURES.md`.

## Core Modules

### Project and Site Metadata

- Construction project, site, package, location, and cost-centre records.
- Client, consultant, architect, subcontractor, and internal owner links.
- Work package status, planned dates, actual dates, and billing milestones.
- Implement this as an ESTI module. The generic upstream project/collaboration
  descriptor is removed from ESTI discovery and must not be re-enabled as the
  primary workflow.

### Rate Analysis

- Material, labour, machinery, subcontract, overhead, and profit components.
- Standard schedule item library.
- Rate build-up by unit and project/site.
- Revision history and approval status.
- Components for carriage, lead, lift, royalty, wastage, contractor profit, GST,
  labour cess, and TDS-aware deductions.
- Formula engine, templates, non-scheduled item support, and approval workflow.

### Estimation

- Project estimate header with customer, site, scope, revision, and validity.
- Estimate lines linked to rate analysis items and BOQ items.
- Abstract, detailed, and comparison views.
- Exportable estimate documents.
- Lifecycle states: draft, internal review, client submission, revised estimate,
  technical sanction, and approved copy.
- Approved estimates are locked; revisions create new versions with full audit
  history.

### BOQ

- BOQ sections, groups, line items, units, quantities, rates, and amounts.
- Versioning, locked revisions, and change notes.
- Links to estimate, purchase, stock issue, and billing workflows.
- Support for work packages and subcontract packages.
- Spreadsheet-style editing, auto amount calculation, DSR/SOR item linking,
  client BOQ versus internal BOQ, and variation tracking.

### DSR/SOR Library

- CPWD DSR, State PWD SOR, Irrigation, NHAI, and MES schedules.
- Department, authority/state, year, chapter, item code, description, unit, base
  rate, lead included, lift included, GST inclusion, effective date, and
  specification reference.
- Excel import, search/filter, year-wise comparison, state-specific rates, and
  historical tracking.

### Lead And Lift

- Quarry/source mapping, site mapping, distance calculation, initial lead
  inclusion, extra lead calculation, lift calculation, and transport mode.
- Lead statement, lift statement, and carriage cost sheet outputs.

### Billing

- RA bills, final bills, advances, retention, deductions, and recoveries.
- Measurement book references and certified quantity tracking.
- GST-ready invoice documents.
- Customer and subcontractor billing variants.
- Previous, current, cumulative, and certified quantities for measurement book
  and RA billing.
- Labour cess, royalty, TDS, GST, advance recovery, and final payable amount.

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
- Generic product, service, barcode, and variant module descriptors are also
  removed. Site-store item masters should be construction material/service
  masters with HSN/SAC, unit, GST, supplier-rate, and BOQ-consumption context.

### Document Control

- Project/site documents, drawings, revisions, approvals, transmittals, and
  contractor submissions.
- BOQ, estimate, purchase, billing, and GST document links.
- Implement this as an ESTI construction document-control module. The generic
  upstream ECM descriptor is removed from ESTI discovery.

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
- Initial table families: DSR/SOR, BOQ, estimate versions, rate analysis, lead
  and lift statements, measurement books, RA bills, variation claims, and project
  cost tracking.

## First Implementation Order

1. ESTI project/site metadata.
2. DSR/SOR library.
3. Rate analysis.
4. Estimation.
5. BOQ.
6. Lead and lift.
7. Measurement book and RA billing.
8. Purchase and site-store links.
9. Labour team management.
10. GST reporting exports.
