# ESTI Documentation

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

ESTI is the **ESTI Architect Platform**, developed by **Holagundi Consulting
Works (HCW)** — practice-management software for Indian freelance architects and
small architecture offices, built as a fork of Dolibarr ERP (GPL-3.0-or-later).

This directory is the source of truth for product, architecture, migration, and
runtime planning.

## How this documentation is organised

The set is layered. Read top-down; lower tiers assume the tiers above.

| Tier | Changes | Documents |
|---|---|---|
| **1 — Vision** (why) | Rarely | [PRODUCT-VISION](PRODUCT-VISION.md) |
| **2 — Specification** (what / how) | Per major decision | [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md), [ARCHITECTURE](ARCHITECTURE.md) |
| **3 — Plans** (when / in what order) | Every release | [ROADMAP](ROADMAP.md), [MIGRATION-ROADMAP](MIGRATION-ROADMAP.md) |
| **4 — Reference & Policy** (rules) | Rarely | [BACKEND-PROFILE](BACKEND-PROFILE.md), [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md), [INDIA-PROFILE](INDIA-PROFILE.md), [PODMAN-RUNTIME](PODMAN-RUNTIME.md), [LICENSE-NOTICE](LICENSE-NOTICE.md) |

### Recommended reading order

1. [PRODUCT-VISION](PRODUCT-VISION.md) — what ESTI is, who it serves, who owns it.
2. [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) — the modules, users, and workflows.
3. [ARCHITECTURE](ARCHITECTURE.md) — TS service of record + Dolibarr-as-data,
   Carbon React SPA, viewer worker, Podman pod, and the architecture decision
   records.
4. [ROADMAP](ROADMAP.md) then [MIGRATION-ROADMAP](MIGRATION-ROADMAP.md) — the
   forward build order and the Dolibarr→ESTI fork-migration phases.
5. Reference & Policy docs as needed.

## Single sources of truth (avoid duplication)

To keep the set drift-free, each topic has exactly one canonical document. Other
documents **link** to it rather than restating it.

| Topic | Canonical document |
|---|---|
| Product positioning & ownership | [PRODUCT-VISION](PRODUCT-VISION.md) |
| **Module registry** (names, bases, tables) | [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) → *Module Map* |
| Frontend stack & UI architecture | [ARCHITECTURE](ARCHITECTURE.md) |
| UI design language (principles, components, tokens) | [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) |
| GST / TDS / India tax policy | [INDIA-PROFILE](INDIA-PROFILE.md) |
| Removed / retained backend surfaces | [BACKEND-PROFILE](BACKEND-PROFILE.md) |
| Dev/target container runtime | [PODMAN-RUNTIME](PODMAN-RUNTIME.md) (dev) + [ARCHITECTURE](ARCHITECTURE.md) (target pod) |
| License, trademark, attribution | [LICENSE-NOTICE](LICENSE-NOTICE.md) |

## Conventions

- **Module / table naming:** backend modules under `htdocs/esti_*`; descriptors
  `htdocs/core/modules/modEsti*.class.php`; tables `llx_esti_*`. Where a module
  layers on a Dolibarr base, its name disambiguates from the base — canonical
  names `esti_clientlog` and `esti_invoiceindia` (see
  [PRODUCT-VISION § Naming Conventions](PRODUCT-VISION.md)).
- **`hcw_` in source design docs** maps to `esti_` in this repository.
- When you add a module, table, or endpoint, update the **canonical** document
  for that topic (above) and link from anywhere else that mentions it.
- **Every document carries a status line** under its title
  (`Status · Owner · Reviewed`). Update `Reviewed` when a doc materially changes,
  and mark a superseded doc explicitly (as CARBON-UI-DIRECTION points to
  ARCHITECTURE for stack decisions).

## Glossary

| Term | Meaning |
|---|---|
| HCW | Holagundi Consulting Works — ESTI's developer |
| SPA | Single-page application (the Carbon React front end) |
| ADR | Architecture Decision Record |
| COA | Council of Architecture (India) — fee scale of charges |
| SAC | Service Accounting Code; architectural services 998321–998339 (all 18%) |
| GST / CGST / SGST / IGST | Goods & Services Tax and its central/state/inter-state components |
| TDS | Tax Deducted at Source (u/s 194J for professional fees) |
| BPAS / RERA / OC / CC | Building Plan Approval System / Real Estate regulator / Occupancy / Completion Certificate |
| Phase | Architect work stage: Concept, SD, DD, WD, Permit, Tender, Execution, Completion |
| DXF | AutoCAD drawing exchange format (input to the takeoff viewer) |
| Takeoff | Measuring quantities off a drawing into BOQ / fee lines |
| DSR / SOR | (CPWD) Schedule of Rates — retained reference/costing engine |
| BOQ | Bill of Quantities — costing support, rebuilt only when takeoff needs it |
| Composition / Bill of Supply | GST scheme (5% flat, no ITC) issuing a bill of supply, not a tax invoice |
| 26AS / AIS | Income-tax statements used to reconcile TDS deducted by clients |
| Reconcile | Matching invoices↔receipts↔bank, and TDS/GST vs returns |
| tRPC | Typed RPC contract between the SPA and the ESTI backend |
| Magic-link | Passwordless client-portal login via emailed token |

## Module-level reference

Implementation notes live with the module source, e.g.
[`htdocs/esti_dsrsor/README.md`](../../htdocs/esti_dsrsor/README.md) documents the
retained DSR/SOR reference module used for BOQ, tender, and takeoff support.
