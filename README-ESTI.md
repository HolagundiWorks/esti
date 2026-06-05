# ESTI ERP

ESTI ERP is a planned Indian construction ERP fork based on Dolibarr ERP & CRM.
The goal is to keep Dolibarr's reliable modular core while shaping the product
for contractors, builders, civil engineers, quantity surveyors, and construction
procurement teams in India.

## Product Focus

ESTI will prioritize construction workflows:

- Rate analysis for materials, labour, machinery, overheads, and contractor margin.
- CPWD DSR, State PWD SOR, Irrigation, NHAI, and MES schedule libraries.
- Estimation and costing for residential, commercial, infrastructure, and interior projects.
- BOQ preparation, revisions, versioning, and approval workflows.
- Lead and lift calculations, carriage statements, and source/site mapping.
- Running bills, RA bills, final bills, retention, advances, deductions, and GST-ready invoices.
- Measurement book entry with previous, current, cumulative, and certified quantities.
- Labour team management, attendance, subcontractor work orders, and wage tracking.
- Stock, site stores, material issue, returns, wastage, and reconciliation.
- Purchase requisitions, supplier comparison, purchase orders, GRN, and supplier bills.
- Project cost control by site, work package, BOQ item, and contractor.

## Backend Profile

ESTI is being stripped down from a general ERP profile into an India-first
construction profile. The current backend removes module discovery for broad
CRM, sales orders, POS, ecommerce, HR, recruitment, expenses, MRP, helpdesk,
surveys, email campaigns, events, interventions, knowledge base, generic product
management, generic services, projects/collaboration, ECM, barcodes,
multi-currency, and subtotals.

Legacy routes for removed modules return `410 Gone`, and
`containers/apply-esti-defaults.php` keeps the related module constants disabled
for new and existing development databases. Some upstream source directories may
remain as compatibility boundaries until hard includes, upgrade assumptions,
menus, permissions, APIs, and templates are audited.

## Forking Principles

- Preserve Dolibarr compatibility where possible so upstream updates can be merged.
- Prefer extension modules over direct core modification.
- Keep India-specific behaviour configurable through ESTI modules and constants first.
- Remove or disable global functionality only after a migration and compatibility review.
- Keep all redistributed source code under GPL-compatible terms.

## Documentation

The ESTI planning documents are in [docs/esti](docs/esti):

- [License and Notices](docs/esti/LICENSE-NOTICE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Podman Runtime Plan](docs/esti/PODMAN-RUNTIME.md)
- [India Localization and GST](docs/esti/INDIA-LOCALIZATION-GST.md)
- [India Construction Feature Requirements](docs/esti/INDIA-CONSTRUCTION-FEATURES.md)
- [Construction Modules](docs/esti/CONSTRUCTION-MODULES.md)
- [Backend Profile](docs/esti/BACKEND-PROFILE.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)

## First ESTI Module

The first construction module scaffold is `htdocs/esti_dsrsor`, exposed as
`ESTI DSR/SOR`. It creates DSR/SOR master, version, and item tables and provides
a searchable schedule-item library for CPWD DSR, State PWD SOR, Irrigation,
NHAI, and MES schedules.

## Repository Links

Use `https://github.com/HolagundiWorks/esti` for ESTI source, issues, updates,
release notes, and public documentation. Dolibarr references should remain only
for legal notices, upstream-derived code, compatibility APIs, or upstream patch
review.

## Legal Note

Dolibarr is distributed under GPL-3.0-or-later. ESTI can be rebranded and
modified, but redistributed modified versions must preserve the GPL freedoms,
include source code, keep upstream copyright notices, and avoid misuse of the
Dolibarr trademark. See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and the
ESTI license notice for the working policy.
