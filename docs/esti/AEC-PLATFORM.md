# ESTI — Architecture Office Management Platform

ESTI is developed by **Holagundi Consulting Works (HCW)**.

ESTI began as a Dolibarr ERP fork and an Indian construction-estimation tool.
The product direction is now narrowed and sharpened: ESTI is a **practice
management platform for Indian freelance architects and small architecture
offices**. Construction estimating remains available only where it supports
architectural workflows, such as BOQ support, drawing takeoff, consultant scope,
and client fee proposals.

This document is the product-vision source of truth. The detailed engineering
direction lives in:

- [SPA Architecture](SPA-ARCHITECTURE.md) — API-only Dolibarr backend, Carbon
  React single-page app, DXF/PDF viewer service, and Podman pod.
- [Architect Practice Profile](ARCHITECT-PROFILE.md) — phases, permits,
  drawings, COA fees, consultants, client portal, and drawing takeoff.
- [Product Roadmap](ROADMAP.md) and [Migration Roadmap](MIGRATION-ROADMAP.md).

## Ownership and Attribution

- **Developer / maintainer:** Holagundi Consulting Works (HCW).
- **Product name:** ESTI (ESTI Architect Platform).
- **Source, issues, releases, docs:** `https://github.com/HolagundiWorks/esti`.
- **Upstream base:** Dolibarr ERP & CRM (GPL-3.0-or-later). ESTI preserves the
  GPL, upstream copyright notices, and clear "modified fork of Dolibarr"
  attribution. See [License and Notices](LICENSE-NOTICE.md).

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

ESTI is moving to an **API-only Dolibarr backend + standalone Carbon React SPA**:

- Dolibarr runs headless. Its server-rendered PHP UI is a compatibility boundary
  while APIs are built and will be blocked for end users once React screens are
  complete.
- A Carbon Design System React SPA is the only product UI.
- A Node.js viewer service renders DXF to SVG and supports PDF drawing review.
- All services run as one Podman pod in development.
- Existing ESTI construction modules remain backend data services where useful,
  but new product work prioritizes architect-office modules.

## Naming Conventions

- Product and documentation use **ESTI Architect Platform** or **ESTI**.
- Company name is **Holagundi Consulting Works (HCW)**.
- All new database tables use the `llx_esti_*` prefix.
- All new backend modules live under `htdocs/esti_*` with descriptors in
  `htdocs/core/modules/modEsti*.class.php`.
- HCW draft documents may contain `hcw`-prefixed examples. In this repository
  they are implemented as `esti`-prefixed modules, tables, and endpoints.
