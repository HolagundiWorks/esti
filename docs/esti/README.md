# AORMS Documentation

**Status:** Canonical index · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-07-09

> **Nomenclature:** **AORMS** (Architecture Office Resource Management System) is
> the **workspace** — the product. **ESTI** (Embedded Studio Intelligence) is the
> **intelligence/agent layer** embedded in it (ESTI AI, Ask ESTI, cognition
> engine, ESTI Pulse). Code identifiers keep the `esti` codename.

This directory is the single source of truth for AORMS product and engineering
direction. **Obsolete specs** live under [`../archive/`](../archive/README.md) with
a banner explaining what superseded them — do not use archived files for
implementation.

**Public user documentation:** [wiki.aorms.in](https://wiki.aorms.in) (getting
started, workflows, estimation, finance, account setup).

## Read first

New here? Read in this order:

1. [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) — the north-star **and the single source of truth for current system state** (its "System state" section lists what's live / removed / rebuilding). Where any other doc disagrees about what exists, this one wins.
2. [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) + [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) — the active rebuild (the old Estimation OS + Construction Cost spine + Rate Books were torn down 2026-06-28; the CMS is the unified replacement built on the Knowledge Bank foundation).
3. [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS](PLANS-AND-TIERS.md) — role capabilities + **one standard licence** (storage, AI usage; no tiers or trials).
4. [HCW-UI-KIT](HCW-UI-KIT.md) — **the canonical, layered design system** (`@hcw/ui-kit`), used everywhere including the landing page. [AORMS-BRANDING-KIT](AORMS-BRANDING-KIT.md) is brand heritage. [MATERIAL-UI-DIRECTION](MATERIAL-UI-DIRECTION.md) is the historical Carbon→MUI migration playbook. `@carbon/react` was removed (2026-07).
5. [NAVIGATION](NAVIGATION.md) — **the canonical navigation IA** (Canonical V3: Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties · Office · Finance · LXOS · Admin).
6. [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) + [ROADMAP](ROADMAP.md) + [PRD](PRD.md) — module IA rationale / delivery history / requirements; **defer to [NAVIGATION](NAVIGATION.md) for the sidebar** and to the System state in (1) where they describe removed modules.

Repo agent entry file: [`CLAUDE.md`](../../CLAUDE.md) (module map + conventions).

## Canonical Documents

| Document | Authority |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) | **Read first** — north-star product architecture |
| [NAVIGATION](NAVIGATION.md) | **Canonical navigation IA** — sidebar and module placement |
| [PLANS-AND-TIERS](PLANS-AND-TIERS.md) | **Standard licence** — ACTIVE workspace, 5 GB included, storage + AI usage |
| [AORMS-PRODUCT-AUTOPILOT-ROADMAP](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) | Product pivot implementation queue |
| [HCW-UI-KIT](HCW-UI-KIT.md) | **Canonical layered design system** (`@hcw/ui-kit`) |
| [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) | Construction-intelligence reference layer (rebuild foundation) |
| [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) | **Active build** — unified CMS |
| [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) | L1–L5 access ladder and capability matrices |
| [PRODUCT-VISION](PRODUCT-VISION.md) | Product purpose, users, and boundaries |
| [STABILITY-CHARTER](STABILITY-CHARTER.md) | Long-term scope discipline |
| [PRD](PRD.md) | Functional and non-functional requirements |
| [ARCHITECTURE](ARCHITECTURE.md) | Stack, security model, data ownership |
| [ROADMAP](ROADMAP.md) | Delivery status, gaps, and acceptance gates |
| [VPS-INSTALL](VPS-INSTALL.md) | VPS deployment guide |
| [ADMIN-GUIDE](ADMIN-GUIDE.md) | Operator guide (deploy, licence, URLs) |
| [PRODUCTION-OPS](PRODUCTION-OPS.md) | VPS secrets, TLS, backup/restore |
| [DEMO-AND-HR-MODE](DEMO-AND-HR-MODE.md) | Demo account set and midnight IST reset |
| [INDIA-PROFILE](INDIA-PROFILE.md) | INR, FY, GST, TDS, COA constants |
| [LICENSE-NOTICE](LICENSE-NOTICE.md) | Ownership and distribution policy |

Build and runtime instructions: [DEVELOPMENT.md](../../DEVELOPMENT.md) · [INSTALL.md](../../INSTALL.md).

Firm-specific practice guides: [docs/holagundi/](../holagundi/README.md).

## Archived documentation

See [`../archive/README.md`](../archive/README.md). Includes retired tier/desktop
guides (Lite/Community/ESTICAD), Carbon UI audits, and historical market research.

## Precedence

When documents appear inconsistent, use this order:

0. **`UNIFIED-ARCHITECTURE-V4.md` § "System state"** for **what currently exists**
0b. **`NAVIGATION.md`** for the **sidebar and module placement**
1. `PRODUCT-VISION.md` for product boundary.
2. `STABILITY-CHARTER.md` for long-term scope and IA discipline.
3. `PRD.md` for required behaviour.
4. `ARCHITECTURE.md`, `INDIA-PROFILE.md`, and `HCW-UI-KIT.md` for implementation constraints.
5. `ROADMAP.md` for delivery status and order.

## Change Rule

Every material feature change updates the PRD/module profile and roadmap in the
same pull request. Superseded large specs move to `docs/archive/` with a
supersession banner — do not leave competing instructions in the active tree.
