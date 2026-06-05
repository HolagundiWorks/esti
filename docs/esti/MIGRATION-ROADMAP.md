# ESTI Migration Roadmap

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
- Non-construction module descriptors removed from backend discovery; legacy
  routes return `410 Gone`.
- Podman development runtime in place (`containers/`).

## Phase 1: Product Identity — DONE

- Visible product name replaced with `ESTI ERP` through theme and configuration.
- Logos, favicon, login branding, document headers, and email footers updated.
- Upstream legal attribution kept in About, docs, and distribution metadata.
- ESTI default configuration profile for Indian construction users in place.

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

## Phase 4: Backend Profile And Construction Modules — In Progress

- Construction-only backend profile documented in `docs/esti/BACKEND-PROFILE.md`.
- Stale menus and permissions for removed modules: pending audit.
- `esti_dsrsor` — DSR/SOR library module: **operational**. Includes module
  descriptor, SQL tables (master, version, item, import_batch, audit),
  DsrItem class, DsrSorImport class, item list with full search/filter, item
  card, import page with preview validation, admin setup, and live dashboard.

Next construction modules to build:

- `esti_projectsite` — first; defines project/site data model that all billing
  and BOQ modules will reference.
- `esti_rateanalysis` — rate buildup library.
- `esti_estimation` — estimate header and line items.
- `esti_boq` — bill of quantities.
- `esti_billing`, `esti_labour`, `esti_sitestock`, `esti_purchase` — operations.

Use Dolibarr hooks and CommonObject patterns before changing core classes. All
new database tables use the `llx_` prefix and store entity for multi-company.

## Phase 5: UI Redesign — In Progress

- ESTI Carbon-inspired theme operational: IBM blue, light/dark mode, Carbon
  icon substitution for all FA icons, IBM Plex typography.
- React shell at `/estiui/` shows live module-card dashboard with status
  indicators (Available / In Design / Planned) and live link to DSR/SOR.
- Remaining workflow screens will be migrated to Carbon/React one module at a
  time after PHP scaffolds are functional and permission-safe.
- Theme customization modules remain disabled in the ESTI distribution profile.

## Phase 6: Containers and Install — Partial

- Podman Compose runtime in place: app, database, and admin tools.
- One-command start/stop scripts (`containers/start-dev.ps1`, `stop-dev.ps1`).
- Post-install ESTI defaults script (`containers/apply-esti-defaults.php`).
- Upgrade and backup documentation: **pending**.

## Phase 7: Release Hardening — Not Started

- Run creation, edit, delete, permissions, and multi-entity validation for all
  ESTI modules.
- Add PHPUnit coverage for construction object classes and GST calculations.
- Document upgrade path from upstream Dolibarr and from earlier ESTI versions.
- Publish GPL source, container image metadata, changelog, and security policy.
- Publish ESTI releases and changelogs from the ESTI GitHub repository.

## Non-Goals For The First Release

- Physical deletion of retained upstream compatibility directories before hard
  includes, upgrade scripts, menus, permissions, and APIs are audited.
- Remote marketplace installation in the ESTI distribution profile.
- Proprietary relicensing of Dolibarr-derived code.
- Global ERP support for all countries.
- Complex theme marketplace or user-defined theme customization.
