# India Construction Feature Requirements

This document defines the mandatory India-specific construction features for
ESTI ERP. These requirements drive the first construction modules and replace
generic upstream product, project, ECM, and stock workflows with ESTI-specific
construction workflows.

## Mandatory Schedule Support

ESTI must support Indian public-work and construction schedule libraries:

- CPWD DSR.
- State PWD SOR.
- Irrigation schedules.
- NHAI schedules.
- MES schedules.

Schedule data must be versioned by department, state or authority, and year.
Historical rates must remain available for old estimates, revisions, audit, and
comparison reports.

## Version Control And Audit

- DSR/SOR versions are tracked by year and effective date.
- Historical item rates are immutable after use in approved estimates or bills.
- Estimate revisions create new versions rather than overwriting approved data.
- Approved estimates and bills are locked.
- Every approval, revision, import, rate change, and billing certification must
  write an audit trail with user, timestamp, old value, new value, and reason.

## Tax And Statutory Handling

ESTI construction workflows must support:

- GST, including CGST, SGST, IGST, cess, and HSN/SAC classification.
- Labour cess.
- Royalty.
- TDS support.
- Statutory deductions and recoveries on RA and final bills.

Internal storage may continue to use Dolibarr-compatible tax fields where
needed, but user-facing screens and documents must use India construction and
GST terminology.

## DSR/SOR Module

Initial implementation scaffold: `htdocs/esti_dsrsor`.

### Fields

- Department.
- State or authority.
- Year.
- Chapter.
- Item code.
- Description.
- Unit.
- Base rate.
- Lead included.
- Lift included.
- GST inclusion.
- Effective date.
- Specification reference.

### Features

- Excel/CSV import with validation and import preview.
- Year-wise item comparison.
- Search and filter by department, year, chapter, item code, description, unit,
  and effective date.
- Historical tracking for rates and specifications.
- State-specific rates and authority-specific schedules.
- Locking for published schedule versions used by estimates or BOQs.
- Import batch tracking and audit trail for create, update, delete, and
  import-driven changes.

## BOQ Module

### Structure

```text
Section
  Sub-section
    Item Code
    Description
    Unit
    Quantity
    Rate
    Amount
```

### Features

- Spreadsheet-style editing.
- Auto amount calculation.
- DSR/SOR item linking.
- BOQ versioning.
- Client BOQ and internal BOQ variants.
- Variation tracking.
- Section, sub-section, and item-level totals.
- Links to estimate, rate analysis, measurement book, RA bill, purchase, and
  site-store workflows.

## Rate Analysis Module

### Components

- Materials.
- Labour.
- Machinery.
- Carriage.
- Lead.
- Lift.
- Royalty.
- Wastage.
- Overheads.
- Contractor profit.
- GST and cess.

### Features

- Analysis templates.
- Non-scheduled item support.
- Material and labour master rates.
- Formula engine.
- Approval workflow.
- Links to DSR/SOR items, BOQ items, estimates, and project/site cost centres.

## Lead And Lift Management

### Required Features

- Quarry/source mapping.
- Site mapping.
- Distance calculation.
- Initial lead inclusion.
- Extra lead calculation.
- Lift calculation.
- Transport mode selection.
- Approval statements.

### Outputs

- Lead statement.
- Lift statement.
- Carriage cost sheet.

## Estimate Version Control

### Lifecycle

- Draft.
- Internal review.
- Client submission.
- Revised estimate.
- Technical sanction.
- Approved copy.

### Rules

- Approved estimates are locked.
- Revisions create new versions.
- Full audit log is maintained.
- Revisions must preserve links to the source DSR/SOR version, BOQ version, rate
  analysis version, GST assumptions, and approval status.

## RA Billing And Measurement Book

### Features

- Measurement entry.
- Running quantities.
- Previous, current, and cumulative quantities.
- Certified quantity.
- Retention handling.
- GST calculations.
- Labour cess, royalty, TDS, advance recovery, deductions, and recoveries.
- Final payable amount calculation.

### Outputs

- Measurement book sheets.
- RA bills.
- Final bills.
- Client statements.

## Carbon UI Screen Requirements

Core screens must follow the ESTI Carbon UI direction:

- Dashboard.
- DSR/SOR Library.
- BOQ Builder.
- Estimate Builder.
- Rate Analysis Sheet.
- Lead/Lift Calculator.
- Measurement Book Entry.
- RA Billing.
- Project Dashboard.
- Reports.

Use Carbon-aligned components and interaction patterns:

- DataTable.
- SideNav.
- Tabs.
- Modal.
- ComboBox.
- Toast notifications.
- DatePicker.
- Inline loading.
- Tag and status indicators.

## Initial Database Tables

All tables must use the Dolibarr `llx_` prefix in SQL scripts. Proposed logical
table names:

- `dsr_master`.
- `dsr_version`.
- `dsr_item`.
- `boq_master`.
- `boq_item`.
- `estimate_set`.
- `estimate_version`.
- `rate_analysis`.
- `lead_statement`.
- `lift_statement`.
- `measurement_book`.
- `ra_bill`.
- `variation_claim`.
- `project_cost_tracking`.

Physical implementation should include `llx_` prefixes, `entity`, `fk_user_creat`,
`fk_user_modif`, `datec`, `tms`, status fields, indexes for list filters, and
foreign keys or documented logical links where Dolibarr compatibility requires
soft references.
