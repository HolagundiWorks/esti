# ESTI — Architecture Office Management Platform

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

ESTI is developed by **Holagundi Consulting Works (HCW)**.

ESTI began as a Dolibarr ERP fork but is now **greenfield, original software**
(no Dolibarr, no PHP). It is a **practice management platform for Indian
freelance architects and small architecture offices**. Construction estimating
remains only where it supports architectural workflows — BOQ support, drawing
takeoff, consultant scope, and client fee proposals.

This document is the product-vision source of truth. The detailed engineering
direction lives in:

- [System Architecture](ARCHITECTURE.md) — greenfield hybrid: TypeScript core +
  React SPA + Python worker (DXF/PDF/reconciliation), PostgreSQL, Podman pod.
- [Architect Practice Profile](ARCHITECT-PROFILE.md) — phases, permits,
  drawings, COA fees, consultants, client portal, and drawing takeoff.
- [Product Roadmap](ROADMAP.md) and [Migration Roadmap](MIGRATION-ROADMAP.md).

## Ownership and Attribution

- **Developer / maintainer:** Holagundi Consulting Works (HCW).
- **Product name:** ESTI (ESTI Architect Platform).
- **Source, issues, releases, docs:** `https://github.com/HolagundiWorks/esti`.
- **Origin / license:** began as a Dolibarr fork (GPL-3.0-or-later); now
  rebuilt greenfield with no Dolibarr code. Once the legacy `htdocs/` tree is
  removed, ESTI is original work and **HCW chooses its license**. See
  [License and Notices](LICENSE-NOTICE.md).

Holagundi Consulting Works is both the developer of ESTI and the reference
architecture practice whose workflows drive the product.

## Product Positioning

ESTI is not a general ERP, CRM, ecommerce suite, HR suite, warehouse system, or
contractor operations system. It is an office operating system for architects:

- Convert enquiries into fee proposals.
- Manage clients, projects, phases, approvals, and communication.
- Track statutory permits, submissions, and due dates.
- Maintain a drawing/document register with revisions and issue history.
- Coordinate consultants and collaborators.
- Generate phase-linked invoices with GST/TDS support.
- Review receivables, workload, project health, and compliance risk.
- Measure drawings and push quantities into fee/BOQ support workflows.

The first target user is an Indian freelance architect or small office that
needs practical control over projects, clients, drawings, fees, consultants, and
statutory work without carrying the weight of a full generic ERP.

## Core Modules

- **Dashboard** — office health, receivables, active projects, upcoming permit
  deadlines, stale approvals, and current workload.
- **Clients & Leads** — architect-friendly client records, enquiry status,
  communication log, and project conversion.
- **Projects & Phases** — Concept, SD, DD, WD, Permit, Tender, Execution, and
  Completion phases with dates, status, billing percentage, and owner.
- **Fee Proposals** — COA benchmark support, custom scope, inclusions,
  exclusions, deliverables, revision history, and client approval.
- **Invoicing & Tax** — phase-linked invoices, GST, SAC, TDS u/s 194J, receipts,
  and exports for accountant review.
- **Permits & Compliance** — BPAS, RERA, Fire NOC, Aviation NOC, environmental
  clearance, OC, CC, BESCOM, BWSSB, and local authority tracking.
- **Drawings & Documents** — drawing register, file vault, revision control,
  issue sets, watermarks, and approval log.
- **Consultants & Collaborators** — structural, MEP, electrical, plumbing,
  landscape, interiors, fire, survey, and legal assignments with fees and scope.
- **Client Portal** — read-only access to issued drawings, invoices, approvals,
  and status summaries.
- **Drawing Viewer & Takeoff** — DXF/PDF viewer, scale calibration, two-point
  measurement, and push-to-BOQ/fee-support lines.
- **Reports** — project status, fee pipeline, receivables, TDS reconciliation,
  permit aging, drawing issue register, and consultant balance.

## Construction Features After The Pivot

Contractor-centric workflows are no longer the product centre. The following
construction capabilities stay only as supporting engines for architecture
practice needs:

- DSR/SOR libraries for reference rates and quantity support.
- BOQ and estimate structures for tender documents and client/internal costing.
- Drawing takeoff to feed BOQ or scope quantities.
- Basic project cost references where an architect offers PMC or turnkey support.

The following are not first-release goals: labour team management, site stock,
warehouse operations, purchase orders, RA billing, contractor measurement books,
and subcontractor payment workflows.

## Architecture Direction

ESTI is **greenfield with no Dolibarr and no PHP**. Full detail and the
architecture decision records are in [ARCHITECTURE](ARCHITECTURE.md).

- An **ESTI TypeScript/Fastify** service is the system of record and owns the
  domain, auth, money/tax, and business rules in its own **PostgreSQL** schema.
- A **Carbon Design System React + TypeScript** SPA is the only UI, type-unified
  with the backend via tRPC.
- A **Python worker** handles DXF takeoff (ezdxf), PDF generation (WeasyPrint),
  and reconciliation imports (pandas).
- All services run as one Podman pod (Postgres, Redis, backend, worker,
  frontend, object storage) — no Dolibarr container.
- Single firm, INR-only, FY Apr–Mar, and the three GST systems are hardcoded —
  see [INDIA-PROFILE](INDIA-PROFILE.md).

## Naming Conventions

- Product and documentation use **ESTI Architect Platform** or **ESTI**.
- Company name is **Holagundi Consulting Works (HCW)**.
- All new database tables use the `esti_*` prefix.
- New domain modules are **ESTI TypeScript service modules** (`backend/src/…`),
  not PHP. The legacy `esti_dsrsor` PHP module is retired once its reference data
  is ported (see [BACKEND-PROFILE](BACKEND-PROFILE.md)).
- Module/table names disambiguate their concern. The canonical names are
  `esti_clientlog` (client + communication/lead log) and
  `esti_invoiceindia` (India GST/TDS invoicing) — not `esti_client` or
  `esti_invoice`. Use these exact names in docs, directories, and REST paths.
- HCW draft documents may contain `hcw`-prefixed examples. In this repository
  they are implemented as `esti`-prefixed modules, tables, and endpoints.
