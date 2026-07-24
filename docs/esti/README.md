# AORMS Documentation

**Status:** Canonical index · **Owner:** Human Centric Works (HCW) · **Reviewed:** 2026-07-24

> **Nomenclature:** **AORMS** = platform (AEC consulting firms). **AORMS-Studio** =
> architecture app (this repo). **AORMS-Consultancy** = engineering app (code-complete;
> live (P9.V ✅ · P9.M ✅)). **EOMS** = knowledge bank; **ESTI** = internal AI agent.
> Full rules: [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md).

This directory is the **single source of truth**. Superseded specs are **removed** —
use Git history for old versions.

**Platform north-star:** [AORMS-DEVELOPMENT-SPEC](AORMS-DEVELOPMENT-SPEC.md) ·
**Landing brief:** [../marketing/LANDING-REDESIGN-CONTEXT.md](../marketing/LANDING-REDESIGN-CONTEXT.md) ·
**Public wiki:** [aorms.in/wiki](https://aorms.in/wiki).

## Read first

1. [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md) — naming
2. [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) — live system state
3. [NAVIGATION](NAVIGATION.md) — sidebar IA (Canonical V3)
4. [PLANS-AND-TIERS](PLANS-AND-TIERS.md) + [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) — licence + roles
5. [HCW-UI-KIT](HCW-UI-KIT.md) + [HCW-UI-UX-PRINCIPLES](HCW-UI-UX-PRINCIPLES.md) — design system
6. [ROADMAP](ROADMAP.md) — delivery status (COMPLETE — Studio + Consultancy live)
7. [PRD](PRD.md) — requirements

Repo agent entry: [`CLAUDE.md`](../../CLAUDE.md).

## Canonical documents (one per topic)

| Topic | Document |
| --- | --- |
| Naming | [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md) |
| Hosts / URLs | [AORMS-SURFACE-URLS](AORMS-SURFACE-URLS.md) |
| System state | [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) |
| Navigation IA | [NAVIGATION](NAVIGATION.md) |
| Roadmap | [ROADMAP](ROADMAP.md) |
| Licence | [PLANS-AND-TIERS](PLANS-AND-TIERS.md) |
| Design system | [HCW-UI-KIT](HCW-UI-KIT.md) |
| UX laws | [HCW-UI-UX-PRINCIPLES](HCW-UI-UX-PRINCIPLES.md) |
| Design debt | [DESIGN-DEBT-REGISTER](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) |
| Licensing ops | [HCW-LICENSE-MANAGER](HCW-LICENSE-MANAGER.md) |
| Consultancy design | [AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md) |
| Consultancy SOP map | [AORMS-CONSULTANCY-SOP-CASE-STUDY](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) |
| Pre-con R&O | [AORMS-PRECONSTRUCTION-RO-FRAMEWORK](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) |
| P9.V record | [P9V-CONSULTANCY-WALKTHROUGH](P9V-CONSULTANCY-WALKTHROUGH.md) |
| Philosophy | [AORMS-CONSULTING-FRAMEWORKS](AORMS-CONSULTING-FRAMEWORKS.md) |
| Product boundary | [PRODUCT-VISION](PRODUCT-VISION.md) · [STABILITY-CHARTER](STABILITY-CHARTER.md) |
| Requirements | [PRD](PRD.md) |
| Stack | [ARCHITECTURE](ARCHITECTURE.md) |
| India profile | [INDIA-PROFILE](INDIA-PROFILE.md) |
| Deploy | [VPS-INSTALL](VPS-INSTALL.md) · [ADMIN-GUIDE](ADMIN-GUIDE.md) · [PRODUCTION-OPS](PRODUCTION-OPS.md) |
| Demo | [DEMO-AND-HR-MODE](DEMO-AND-HR-MODE.md) · [DEMO-SEED-ITEMS](DEMO-SEED-ITEMS.md) |
| EOMS | [EOMS-ARCHITECTURE](EOMS-ARCHITECTURE.md) · [EOMS-INTEGRATION](EOMS-INTEGRATION.md) |
| Brand heritage | [AORMS-BRANDING-KIT](AORMS-BRANDING-KIT.md) |

Build: [DEVELOPMENT.md](../../DEVELOPMENT.md) · [INSTALL.md](../../INSTALL.md).  
Firm SOP: [docs/holagundi/](../holagundi/README.md).  
Reference data: [docs/reference/](../reference/README.md).  
Kit docs: [docs/hcw-kit/](../hcw-kit/README.md).

## Precedence

0. `AORMS-PLATFORM-NOMENCLATURE.md` — naming  
1. `UNIFIED-ARCHITECTURE-V4.md` § System state — what exists in code  
2. `NAVIGATION.md` — sidebar  
3. `PRODUCT-VISION.md` / `STABILITY-CHARTER.md` — boundary  
4. `PRD.md` — behaviour  
5. `ARCHITECTURE.md` / `INDIA-PROFILE.md` / `HCW-UI-KIT.md` — constraints  
6. `ROADMAP.md` — delivery status  

## Change rule

Material features update PRD / NAVIGATION / ROADMAP in the same PR. **Delete**
superseded specs — do not leave competing instructions. Git history is the archive.
