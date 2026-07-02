# AORMS Documentation

**Status:** Canonical index · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-07-02

> **Nomenclature:** **AORMS** (Architecture Office Resource Management System) is
> the **workspace** — the product. **ESTI** (Embedded Studio Intelligence) is the
> **intelligence/agent layer** embedded in it (ESTI AI, Ask ESTI, cognition
> engine, ESTI Pulse). Code identifiers keep the `esti` codename.

This directory is the single source of truth for AORMS product and engineering
direction. There is **no archive**: superseded specs are deleted outright (git
history preserves them) and must never compete with current requirements.
*(Deleted so far: the early RIE/bylaw and SteelFlow drafts, the pre-teardown
estimation snapshot, and the 2026-06-15 workflow/architecture audit.)*

## Read first

New here? Read in this order:

1. [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) — the north-star **and the single source of truth for current system state** (its "System state" section lists what's live / removed / rebuilding). Where any other doc disagrees about what exists, this one wins.
2. [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) + [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) — the active rebuild (the old Estimation OS + Construction Cost spine + Rate Books were torn down 2026-06-28; the CMS is the unified replacement built on the Knowledge Bank foundation).
3. [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS](PLANS-AND-TIERS.md) — the two orthogonal gates (person vs. firm edition).
4. [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) — the mandatory Pure Carbon UI law.
5. [NAVIGATION](NAVIGATION.md) — **the canonical navigation IA** (the Canonical V3 nav: Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties · Office · Finance · LXOS · Admin — consultancy-only) with live/planned status per module. Authoritative for the sidebar and module placement.
6. [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) + [ROADMAP](ROADMAP.md) + [PRD](PRD.md) — module IA rationale / delivery history / requirements; **defer to [NAVIGATION](NAVIGATION.md) for the sidebar** and to the System state in (1) where they describe the removed estimation/cost stack.

Repo agent entry file: [`CLAUDE.md`](../../CLAUDE.md) (module map + conventions).

## Canonical Documents

| Document | Authority |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) | **Read first** — north-star product architecture: the six OS pillars (Ask / Project / Task / Construction Cost / Portals / AI) with implemented-vs-planned status |
| [NAVIGATION](NAVIGATION.md) | **Canonical navigation IA** — the Canonical V3 nav (Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties · Office · Finance · LXOS · Admin; consultancy-only) with per-module live/planned status; wins over any other doc on the sidebar and module placement |
| [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) | Module-placement rationale (two delivery heads, one-home-per-module). **Superseded for the sidebar by [NAVIGATION](NAVIGATION.md)**; estimation/cost sections are historical |
| [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) | L1–L5 access ladder, external tier, capability and information matrices (implementation: `permissions.ts`) |
| [PLANS-AND-TIERS](PLANS-AND-TIERS.md) | Lite / Pro editions — module→edition matrix, quotas, `planAllows` gating |
| [PRODUCT-VISION](PRODUCT-VISION.md) | Product purpose, users, and boundaries |
| [STABILITY-CHARTER](STABILITY-CHARTER.md) | Long-term scope discipline — what we implement and reject |
| [PRD](PRD.md) | Functional and non-functional requirements |
| [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) | Module registry and workflow model |
| [HR-PROFILE-SYSTEM](HR-PROFILE-SYSTEM.md) | HR/payroll module — leaves, payroll, salary visibility, org/HR modes |
| [ARCHITECTURE](ARCHITECTURE.md) | Stack, security model, data ownership, ADRs |
| [COGNITION-ENGINE](COGNITION-ENGINE.md) | Continuous office cognition, deterministic scoring, interventions, and LLM boundary |
| [ESTI-PULSE](ESTI-PULSE.md) | **Phase 33, ◐ P-1 shipped** — Project Standup Engine: task dependency graph, missing-parameter detection, consequence-based priority bands + confidence score live; standup question loop + stage-gated agent still planned |
| [ROADMAP](ROADMAP.md) | Current status, gaps, sequence, and acceptance gates |
| [PRODUCTION-OPS](PRODUCTION-OPS.md) | VPS secrets, TLS, backup/restore drill, health probes |
| [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md) | Team demo account set and seed commands |
| [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md) | Team mode rules and legacy HR archive workflow |
| [WORKER-LIMITS.md](WORKER-LIMITS.md) | PDF worker idempotency, retries, resource limits |
| [ESTICAD-COMPANION](ESTICAD-COMPANION.md) | ESTICAD desktop integration — cloud takeoff, device auth, proxied CAD AI |
| [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) | **Target (rebuild foundation)** — the layered construction-intelligence reference layer: Material / Labor / Item / Specification libraries, consumption recipes, and the formula + derivation engine. Everything downstream (CMS estimate, BOQ, bills) reads from it |
| [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md) | **Active build** — unified CMS: Element spine (permanent identity EL-001), Estimate, BOQ, Final Estimation Set, Site Measurement Book, Work Orders, Contractor Bill Certification, Material Intelligence, Cost Dashboard. Supersedes the former "Estimation OS" concept entirely |
| [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) | Mandatory Pure Carbon UI rules |
| [INDIA-PROFILE](INDIA-PROFILE.md) | INR, FY, GST, TDS, COA, and India constants (reference appendix; live values come from the `profile` tRPC namespace) |
| [LICENSE-NOTICE](LICENSE-NOTICE.md) | Ownership and distribution policy |

Build and runtime instructions live in [DEVELOPMENT.md](../../DEVELOPMENT.md).

Firm-specific practice guides: [docs/holagundi/](../holagundi/README.md).

## Precedence

When documents appear inconsistent, use this order:

0. **`UNIFIED-ARCHITECTURE-V4.md` § "System state"** for **what currently exists**
   (live / removed / rebuilding) — authoritative; overrides any other doc on current state.
0b. **`NAVIGATION.md`** for the **sidebar and module placement** (the Canonical V3 IA, consultancy-only).
1. `PRODUCT-VISION.md` for product boundary.
2. `STABILITY-CHARTER.md` for long-term scope and IA discipline.
3. `PRD.md` for required behaviour.
4. `ARCHITECTURE.md`, `INDIA-PROFILE.md`, and `CARBON-UI-DIRECTION.md` for
   implementation constraints.
5. `ROADMAP.md` for delivery status and order.

“Implemented” means code exists and has passed the roadmap verification gate.
“Planned” means it is required but not yet delivered. Documentation must not
describe planned behaviour as already available.

## Change Rule

Every material feature change updates the PRD/module profile and roadmap in the
same pull request. Changes that affect navigation, geometry capture, or AI issue
paths must cite [STABILITY-CHARTER](STABILITY-CHARTER.md) or record a charter
exception with redirects. Architecture, tax, or UI-policy changes also update
their canonical document. New point-in-time audit files should not be added;
findings go directly into the roadmap backlog with an owner, priority, and
acceptance gate. Superseded large specs are deleted outright — git history is the archive.
