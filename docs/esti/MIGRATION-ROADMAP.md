# ESTI Migration Roadmap

> _Part of the [ESTI documentation set](README.md). This covers the
> **Dolibarr→ESTI fork migration** (strip-down, identity, India baseline,
> backend profile, release hardening). For the forward product build order, see
> [ROADMAP](ROADMAP.md)._

## Phase 0: Repository Baseline — DONE

- Exact upstream Dolibarr version recorded as the fork base.
- ESTI branch strategy in place; no direct commits to main/master/develop.
- Clean upstream remote kept for merging Dolibarr security fixes.
- ESTI documentation, license notices, and contribution rules added.
- Public source, issue, release, update, and support links route to
  `https://github.com/HolagundiWorks/esti`.
- Dolibarr links retained only for legal attribution, upstream merge research,
  and compatibility references.
- Remote module marketplace and upstream module feeds disabled.
- Non-architect-office module descriptors removed from backend discovery; legacy
  routes return `410 Gone`.
- Podman development runtime in place (`containers/`).

## Phase 1: Product Identity — DONE

- Visible product name replaced with `ESTI Architect Platform` / `ESTI` through
  theme and configuration.
- Logos, favicon, login branding, document headers, and email footers updated.
- Upstream legal attribution kept in About, docs, and distribution metadata.
- ESTI default configuration profile for Indian architecture-office users in
  place.

## Phase 2: India-First Baseline — DONE

- Default country India, currency INR, timezone Asia/Kolkata.
- Language selection restricted to `en_IN`, `en_US`, and Indian locales.
- Non-Indian country, currency, and tax choices disabled by configuration.
- Upstream language and dictionary data retained until upgrade impact is
  tested.

## Phase 3: GST and Accounting Direction — DONE

- GST terminology and India-specific tax profile enabled in ESTI defaults.
- Dolibarr `tva_*` storage treated as legacy compatibility; ESTI UI shows GST.
- CGST, SGST, and IGST enabled using India tax dictionary rows.
- Multi-currency disabled; INR is the only active currency for the first
  release.
- Upstream VAT and currency code retained until upgrade-safe removal is
  planned.

## Phase 4: Backend Profile And Architect Modules — In Progress

- Architect-office backend profile documented in `docs/esti/BACKEND-PROFILE.md`.
- Stale menus and permissions for removed modules: pending audit.
- `esti_dsrsor` — DSR/SOR library module: **operational** as a supporting
  reference/costing engine for architecture BOQ, tender, and takeoff workflows.
  Includes module descriptor, SQL tables (master, version, item, import_batch,
  audit), DsrItem class, DsrSorImport class, item list with full search/filter,
  item card, import page with preview validation, admin setup, and live
  dashboard.

Next architect-office modules to build:

- `esti_projectoffice` / phase model — project, client, jurisdiction, phase
  plan, billing percentage, status, and office ownership.
- `esti_feeproposal` — COA benchmark, scope, deliverables, exclusions,
  revisions, approvals, and PDF output.
- `esti_invoiceindia` — phase-linked invoices, GST, SAC, TDS u/s 194J, receipts,
  and accountant exports.
- `esti_permit` and `esti_bylaw` — approval tracker and local rule reference.
- `esti_drawing`, `esti_approval`, and `esti_takeoff` — drawing register,
  issue/revision log, viewer integration, and BOQ/fee support.

Use Dolibarr hooks and CommonObject patterns before changing core classes. All
new database tables use the `llx_` prefix and store entity for multi-company.

## Phase 5: UI Redesign — In Progress

- ESTI Carbon-inspired theme operational: IBM blue, light/dark mode, Carbon
  icon substitution for all FA icons, IBM Plex typography.
- React shell at `/estiui/` shows live module-card dashboard with status
  indicators (Available / In Design / Planned) and live link to DSR/SOR.
- Remaining workflow screens will be migrated to Carbon/React around architect
  office journeys: dashboard, projects/phases, fee proposals, drawing register,
  permits, invoices, consultants, and client portal.
- Theme customization modules remain disabled in the ESTI distribution profile.

## Phase 6: Containers and Install — Partial

- Podman Compose runtime in place: app, database, and admin tools.
- One-command start/stop scripts (`containers/start-dev.ps1`, `stop-dev.ps1`).
- Post-install ESTI defaults script (`containers/apply-esti-defaults.php`).
- Upgrade and backup documentation: **pending**.

## Phase 7: Release Hardening — Not Started

- Run creation, edit, delete, permissions, and multi-entity validation for all
  ESTI modules.
- Add PHPUnit coverage for architect-office object classes (project/phase, fee
  proposal, India invoice, permit, drawing/approval) and GST/TDS calculations.
- Document upgrade path from upstream Dolibarr and from earlier ESTI versions.
- Publish GPL source, container image metadata, changelog, and security policy.
- Publish ESTI releases and changelogs from the ESTI GitHub repository.

## Non-Goals For The First Release

- Physical deletion of upstream *shared/core* directories that still have hard
  includes, upgrade scripts, menus, permissions, or APIs, before those
  references are audited. (Standalone module descriptors and ESTI's own removed
  modules — e.g. the pruned contractor modules and supplier/reception
  descriptors — are already audited and exempt; they remain recoverable from
  git history.)
- Remote marketplace installation in the ESTI distribution profile.
- Proprietary relicensing of Dolibarr-derived code.
- Global ERP support for all countries.
- Complex theme marketplace or user-defined theme customization.
- Contractor-first operations: RA billing, labour teams, site stock, purchase
  orders, GRN, warehouse workflows, and subcontractor payment operations.
