# AORMS Documentation

**Status:** Canonical index · **Owner:** Human Centric Works (HCW) · **Reviewed:** 2026-07-11

> **Nomenclature (2026-07-11):** **AORMS** = **Accelerated Operational Resources
> Management System** (platform for **AEC consulting firms**). **AORMS-Studio** = architecture app
> in this repo (slug `aorms-studio`, Indian architecture practices). **AORMS-Consultancy** =
> engineering app (slug `aorms-consultancy`, roadmap).
> **EOMS** = Emergent Object Management System (knowledge bank); **ESTI** = internal AI agent (live in **AORMS-Studio**).
> **Portals:** staff workspace = **AORMS-Studio**; external = client / consultant / contractor / site portals; account hub = **AORMS account** + licensing console. Constants: `AORMS_PORTALS` in `frontend/src/lib/product-nomenclature.ts`.
> Full rules: [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md).

This directory is the **single source of truth** for AORMS product and engineering
direction. Superseded specs are **removed** from the tree — use Git history if you
need an old version.

**Platform north-star:** [AORMS-DEVELOPMENT-SPEC](AORMS-DEVELOPMENT-SPEC.md) (public
landing at `/`). **Landing redesign brief:**
[../marketing/LANDING-REDESIGN-CONTEXT.md](../marketing/LANDING-REDESIGN-CONTEXT.md).

**Public user documentation:** [aorms.in/wiki](https://aorms.in/wiki) — central wiki
in four domains: **HCW-UI**, **AORMS-Studio**, **AI core** (EOMS + ESTI), and
**Management**.

## Read first

New here? Read in this order:

0. [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md) — platform vs **AORMS-Studio** naming
0b. [AORMS-CONSULTING-FRAMEWORKS](AORMS-CONSULTING-FRAMEWORKS.md) — philosophy + architecture/engineering operational frameworks
1. [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) — north-star **and live system state for AORMS-Studio**
2. [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) + [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) — the active rebuild (the old Estimation OS + Construction Cost spine + Rate Books were torn down 2026-06-28; the CMS is the unified replacement built on the Knowledge Bank foundation).
3. [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS](PLANS-AND-TIERS.md) — role capabilities + **one standard licence** (storage, AI usage; no tiers or trials).
4. [HCW-UI-KIT](HCW-UI-KIT.md) — **the canonical, layered design system** (`@hcw/ui-kit`), used everywhere including the landing page. [HCW-UI-UX-PRINCIPLES](HCW-UI-UX-PRINCIPLES.md) — UX laws and review checklist. [AORMS-BRANDING-KIT](AORMS-BRANDING-KIT.md) is brand heritage. `@carbon/react` was removed (2026-07).
5. [NAVIGATION](NAVIGATION.md) — **the canonical navigation IA** (Canonical V3: Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties · Office · Finance · LXOS · Admin).
6. [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) + [ROADMAP](ROADMAP.md) + [PRD](PRD.md) — module IA rationale / delivery pointers / requirements; **defer to [NAVIGATION](NAVIGATION.md) for the sidebar** and to the System state in (1) where they describe removed modules.

Repo agent entry file: [`CLAUDE.md`](../../CLAUDE.md) (module map + conventions).

## Canonical Documents

| Document | Authority |
| --- | --- |
| [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md) | **Naming** — platform vs AORMS-Studio vs EOMS vs ESTI |
| [AORMS-CONSULTING-FRAMEWORKS](AORMS-CONSULTING-FRAMEWORKS.md) | **Philosophy + operational frameworks** — architecture vs engineering consultancies |
| [AORMS-DEVELOPMENT-SPEC](AORMS-DEVELOPMENT-SPEC.md) | **Platform north-star** — pre-release architecture (landing `/`) |
| [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) | **Read first for code** — AORMS-Studio system state |
| [NAVIGATION](NAVIGATION.md) | **Canonical navigation IA** — sidebar and module placement |
| [HCW-UI-UX-PRINCIPLES](HCW-UI-UX-PRINCIPLES.md) | **UX audit checklist** — marketing + product surfaces |
| [11-audits/README](../hcw-kit/11-audits/README.md) | **Audit index** — Studio · public · security · kit snapshots |
| [PLANS-AND-TIERS](PLANS-AND-TIERS.md) | **Standard licence** — ACTIVE workspace, 5 GB included, storage + AI usage |
| [AORMS-PRODUCT-AUTOPILOT-ROADMAP](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) | Product pivot implementation queue |
| [AORMS-UI-AUTOPILOT-ROADMAP](AORMS-UI-AUTOPILOT-ROADMAP.md) | Glass-rail + marketing shell rollout |
| [HCW-UI-KIT](HCW-UI-KIT.md) | **Canonical layered design system** (`@hcw/ui-kit`) |
| [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) | Construction-intelligence reference layer (rebuild foundation) |
| [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) | **Active build** — unified CMS |
| [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) | L1–L5 access ladder and capability matrices |
| [PRODUCT-VISION](PRODUCT-VISION.md) | Product purpose, users, and boundaries |
| [STABILITY-CHARTER](STABILITY-CHARTER.md) | Long-term scope discipline |
| [PRD](PRD.md) | Functional and non-functional requirements |
| [ARCHITECTURE](ARCHITECTURE.md) | Stack, security model, data ownership |
| [ROADMAP](ROADMAP.md) | Active delivery pointers |
| [VPS-INSTALL](VPS-INSTALL.md) | VPS deployment guide |
| [ADMIN-GUIDE](ADMIN-GUIDE.md) | Operator guide (deploy, licence, URLs) |
| [PRODUCTION-OPS](PRODUCTION-OPS.md) | VPS secrets, TLS, backup/restore |
| [DEMO-AND-HR-MODE](DEMO-AND-HR-MODE.md) | Demo account set and midnight IST reset |
| [INDIA-PROFILE](INDIA-PROFILE.md) | INR, FY, GST, TDS, COA constants |
| [LICENSE-NOTICE](LICENSE-NOTICE.md) | Ownership and distribution policy |
| [DOC-CODE-DRIFT-2026-07](DOC-CODE-DRIFT-2026-07.md) | **Known-stale** — NAVIGATION/ACCESS-HIERARCHY/UNIFIED-ARCHITECTURE-V4 items not yet reconciled to code, logged 2026-07-09 |

Build and runtime instructions: [DEVELOPMENT.md](../../DEVELOPMENT.md) · [INSTALL.md](../../INSTALL.md).

Firm-specific practice guides: [docs/holagundi/](../holagundi/README.md), including
a deep-dive [Standard Operating Procedures](../holagundi/SOP.md) for the full
Indian architecture practice lifecycle, mapped module-by-module to AORMS.

Reference data (zonal compliance sources): [docs/reference/](../reference/README.md).

## Precedence

When documents appear inconsistent, use this order:

0. **`AORMS-PLATFORM-NOMENCLATURE.md`** for naming (platform vs AORMS-Studio)
0b. **`UNIFIED-ARCHITECTURE-V4.md` § "System state"** for **what currently exists in code**
0b. **`NAVIGATION.md`** for the **sidebar and module placement**
1. `PRODUCT-VISION.md` for product boundary.
2. `STABILITY-CHARTER.md` for long-term scope and IA discipline.
3. `PRD.md` for required behaviour.
4. `ARCHITECTURE.md`, `INDIA-PROFILE.md`, and `HCW-UI-KIT.md` for implementation constraints.
5. `ROADMAP.md` for delivery status and order.

## Change rule

Every material feature change updates the PRD/module profile and roadmap in the
same pull request. **Delete** superseded specs — do not leave competing instructions
in the tree. Git history is the archive.
