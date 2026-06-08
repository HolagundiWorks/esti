# ESTI Documentation

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-07

ESTI is an **AORMS — Architectural Office Resource Management System**, developed
by **Holagundi Consulting Works (HCW)** for Indian freelance architects and small
architecture practices. Greenfield software: TypeScript backend + React/Carbon
SPA + Python worker, on PostgreSQL.

This directory is the source of truth for product, architecture, and runtime
planning.

## How this documentation is organised

| Tier | Changes | Documents |
|---|---|---|
| **1 — Vision** (why) | Rarely | [PRODUCT-VISION](PRODUCT-VISION.md) |
| **2 — Specification** (what / how) | Per major decision | [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md), [ARCHITECTURE](ARCHITECTURE.md) |
| **3 — Plan** (when) | Every release | [ROADMAP](ROADMAP.md) |
| **4 — Reference & Policy** (rules) | Rarely | [INDIA-PROFILE](INDIA-PROFILE.md), [BYLAWS-BBMP](BYLAWS-BBMP.md), [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md), [LICENSE-NOTICE](LICENSE-NOTICE.md) |
| **5 — Audits** (point-in-time review) | Per review | [AUDIT-UIUX](AUDIT-UIUX.md), [AUDIT-ARCHITECTURE](AUDIT-ARCHITECTURE.md) |

Build/run instructions live in [`DEVELOPMENT.md`](../../DEVELOPMENT.md).

### Recommended reading order

1. [PRODUCT-VISION](PRODUCT-VISION.md) — what ESTI is, who it serves, who owns it.
2. [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) — the modules, users, and workflows.
3. [ARCHITECTURE](ARCHITECTURE.md) — the stack, services, and decision records.
4. [ROADMAP](ROADMAP.md) — the build order.
5. Reference & Policy docs as needed.

## Single sources of truth (avoid duplication)

| Topic | Canonical document |
|---|---|
| Product positioning & ownership | [PRODUCT-VISION](PRODUCT-VISION.md) |
| **Module registry** (names, tables) | [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) → *Module Map* |
| Stack, services, ADRs | [ARCHITECTURE](ARCHITECTURE.md) |
| UI design language (principles, components, tokens) | [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) |
| GST / TDS / India tax & fixed constants | [INDIA-PROFILE](INDIA-PROFILE.md) |
| License, trademark, attribution | [LICENSE-NOTICE](LICENSE-NOTICE.md) |

## Conventions

- **Module / table naming:** domain modules are TypeScript under
  `backend/src/modules/*`; tables use the `esti_*` prefix. Names disambiguate
  their concern — canonical names `esti_clientlog` and `esti_invoiceindia` (see
  [PRODUCT-VISION § Naming Conventions](PRODUCT-VISION.md)).
- When you add a module, table, or endpoint, update the **canonical** document
  for that topic (above) and link from anywhere else that mentions it.
- **Every document carries a status line** under its title
  (`Status · Owner · Reviewed`); update `Reviewed` when a doc materially changes.

## Glossary

| Term | Meaning |
|---|---|
| AORMS | Architectural Office Resource Management System |
| HCW | Holagundi Consulting Works — ESTI's developer |
| SPA | Single-page application (the Carbon React front end) |
| ADR | Architecture Decision Record |
| COA | Council of Architecture (India) — fee scale of charges |
| SAC | Service Accounting Code; architectural services 998321–998339 (all 18%) |
| GST / CGST / SGST / IGST | Goods & Services Tax and its central/state/inter-state components |
| TDS | Tax Deducted at Source (u/s 194J for professional fees) |
| Composition / Bill of Supply | GST scheme (5% flat, no ITC) issuing a bill of supply, not a tax invoice |
| 26AS / AIS | Income-tax statements used to reconcile TDS deducted by clients |
| BPAS / RERA / OC / CC | Building Plan Approval System / Real Estate regulator / Occupancy / Completion Certificate |
| Phase | Architect work stage: Concept, SD, DD, WD, Permit, Tender, Execution, Completion |
| DXF | AutoCAD drawing exchange format (input to the takeoff viewer) |
| Takeoff | Measuring quantities off a drawing into BOQ / fee lines |
| tRPC | Typed RPC contract between the SPA and the ESTI backend |
| Portal login | Owner-provisioned, role-scoped login for a client or collaborating consultant (email + password) |
| DSR | Delhi/State Schedule of Rates — versioned rate master for estimation |
| BOQ | Bill of Quantities — priced quantity schedule derived from an estimate |
| BBS | Bar Bending Schedule — reinforcement cutting-length & weight calculator |
| FAR / FSI | Floor Area Ratio — permissible built-up area ÷ site area |
| RBL | Restricted Building Line — building line measured from the road centre |
| ECS | Equivalent Car Space — parking demand unit |
| DIN | Director Identification Number (captured per partner in a partnership firm) |
