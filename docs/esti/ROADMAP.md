# AORMS Implementation Roadmap

**Status:** Canonical pointer · **Updated:** 2026-07-11

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. Retired modules
(Estimation OS, Construction Cost spine, PMC hub, Rate Books, etc.) are **not**
current product state — see system state below.

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) | Active product implementation queue |
| [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) | Glass-rail + marketing shell rollout |
| [PRD.md](PRD.md) | Requirements (cross-check against System state above) |

## Active rebuilds

| Area | Doc |
| --- | --- |
| Cost Management System | [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md) |
| Construction Knowledge Bank | [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) |

## Platform apps (2026-07-11)

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | Shipping — this monorepo |
| **AORMS-Consultancy** (engineering) | Roadmap — see [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) |

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves), and the
relevant autopilot roadmap in the same pull request. **Do not** keep superseded
specs in the tree — delete them; Git history is the archive.
