# ESTI Architect Platform

ESTI is the architecture office management platform developed by **Holagundi
Consulting Works (HCW)** for Indian freelance architects and small architecture
practices.

The project keeps Dolibarr's reliable GPL-licensed modular backend where useful,
but the product experience is architect-first: Carbon React screens, architect
office workflows, India GST/TDS defaults, drawing/document control, permits,
fee proposals, and client collaboration.

## Product Focus

ESTI prioritizes architecture practice workflows:

- Client enquiries, contacts, meeting notes, decisions, and approval records.
- Architecture projects with project type, jurisdiction, phase plan, status,
  dates, and billing percentages.
- COA-aware fee proposals with scope, deliverables, exclusions, revisions,
  approval state, and client-facing output.
- Phase-linked invoicing with GST, SAC `998311`, TDS u/s 194J, receipts, and
  accountant exports.
- Permit and compliance tracking for BPAS, RERA, Fire NOC, Aviation NOC,
  environmental clearance, OC, CC, BESCOM, BWSSB, and local authorities.
- Drawing register, document vault, revision control, issue sets, watermarks,
  and approval history.
- Consultant and collaborator tracking with discipline, scope, fee, payments,
  balance, and project-scoped access.
- Client portal for issued drawings, invoices, approvals, and project status.
- DXF/PDF drawing viewer and two-point measurement takeoff for BOQ or fee
  proposal support.

## Supporting Costing Engines

The existing `htdocs/esti_dsrsor` module remains useful as a DSR/SOR reference
library for BOQ, tender, and drawing takeoff support. Contractor-first
operations are no longer first-release goals:

- labour team management
- site stock and warehouse workflows
- purchase orders, GRN, and supplier bill operations
- contractor RA billing and measurement book certification
- subcontractor payment operations

## Backend Profile

ESTI is being stripped down from a general ERP profile into an architect-office
profile. Removed or disabled upstream surfaces include broad CRM/prospecting,
sales orders, POS, ecommerce, HR, recruitment, expenses, MRP, helpdesk, surveys,
email campaigns, events, interventions, knowledge base, generic products,
generic services, projects/collaboration, generic ECM UI, barcodes,
multi-currency, subtotals, stock, and warehouse workflows.

Legacy routes for removed modules return `410 Gone`, and
`containers/apply-esti-defaults.php` keeps related module constants disabled for
new and existing development databases. Some upstream source directories remain
as compatibility boundaries until hard includes, upgrade assumptions, menus,
permissions, APIs, and templates are audited.

## Forking Principles

- Preserve Dolibarr compatibility where it supports security updates and stable
  backend APIs.
- Prefer ESTI extension modules over direct core modification.
- Keep India-specific behaviour configurable through ESTI modules and constants
  first.
- Remove or disable global functionality only after migration and compatibility
  review.
- Keep all redistributed source code under GPL-compatible terms.

## Documentation

The ESTI planning documents are in [docs/esti](docs/esti):

- [Architecture Office Platform](docs/esti/AEC-PLATFORM.md)
- [Architect Practice Profile](docs/esti/ARCHITECT-PROFILE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [SPA Architecture](docs/esti/SPA-ARCHITECTURE.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Backend Profile](docs/esti/BACKEND-PROFILE.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)
- [India Localization and GST](docs/esti/INDIA-LOCALIZATION-GST.md)
- [India Construction Reference Requirements](docs/esti/INDIA-CONSTRUCTION-FEATURES.md)
- [Construction Reference Modules](docs/esti/CONSTRUCTION-MODULES.md)
- [License and Notices](docs/esti/LICENSE-NOTICE.md)

## Repository Links

Use `https://github.com/HolagundiWorks/esti` for ESTI source, issues, updates,
release notes, and public documentation. Dolibarr references remain only for
legal notices, upstream-derived code, compatibility APIs, or upstream patch
review.

## Legal Note

Dolibarr is distributed under GPL-3.0-or-later. ESTI can be rebranded and
modified, but redistributed modified versions must preserve the GPL freedoms,
include source code, keep upstream copyright notices, and avoid misuse of the
Dolibarr trademark. See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and
[docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).
