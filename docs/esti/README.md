# ESTI Documentation

**Status:** Canonical index · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-25

This directory is the single source of truth for ESTI product and engineering
direction. Point-in-time audits and superseded specs live in
[archive/](archive/README.md); they must not compete with current requirements.

## Read first

New here? Read in this order:

1. [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) — the north-star: what AORMS is (the six OS pillars) + current build status.
2. [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) — the live navigation and module IA as it ships today.
3. [ROADMAP](ROADMAP.md) — delivery history and the active increment (Construction Cost OS Phase D next).
4. [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS](PLANS-AND-TIERS.md) — the two orthogonal gates (person vs. firm edition).
5. [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) — the mandatory Pure Carbon UI law.

Repo agent entry file: [`CLAUDE.md`](../../CLAUDE.md) (module map + conventions).

## Canonical Documents

| Document | Authority |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4](UNIFIED-ARCHITECTURE-V4.md) | **Read first** — north-star product architecture: the six OS pillars (Ask / Project / Task / Construction Cost / Portals / AI) with implemented-vs-planned status |
| [INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) | Live navigation and module IA as it ships today |
| [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) | L1–L5 access ladder, external tier, capability and information matrices (implementation: `permissions.ts`) |
| [PLANS-AND-TIERS](PLANS-AND-TIERS.md) | Lite / Core / Enterprise editions — module→edition matrix, quotas, `planAllows` gating |
| [PRODUCT-VISION](PRODUCT-VISION.md) | Product purpose, users, and boundaries |
| [STABILITY-CHARTER](STABILITY-CHARTER.md) | Long-term scope discipline — what we implement and reject |
| [PRD](PRD.md) | Functional and non-functional requirements |
| [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) | Module registry and workflow model |
| [HR-PROFILE-SYSTEM](HR-PROFILE-SYSTEM.md) | HR/payroll module — leaves, payroll, salary visibility, org/HR modes |
| [ARCHITECTURE](ARCHITECTURE.md) | Stack, security model, data ownership, ADRs |
| [COGNITION-ENGINE](COGNITION-ENGINE.md) | Continuous office cognition, deterministic scoring, interventions, and LLM boundary |
| [ROADMAP](ROADMAP.md) | Current status, gaps, sequence, and acceptance gates |
| [PRODUCTION-OPS](PRODUCTION-OPS.md) | VPS secrets, TLS, backup/restore drill, health probes |
| [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md) | Team demo account set and seed commands |
| [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md) | Team mode rules and legacy HR archive workflow |
| [WORKER-LIMITS.md](WORKER-LIMITS.md) | PDF worker idempotency, retries, resource limits |
| [ESTICAD-COMPANION](ESTICAD-COMPANION.md) | ESTICAD desktop integration — cloud takeoff, device auth, proxied CAD AI |
| [CONSTRUCTION-COST-MANAGEMENT-OS](CONSTRUCTION-COST-MANAGEMENT-OS.md) | **Target umbrella** — full cost lifecycle (estimate→tender→award→measurement→bill→deviation/variation→final account); ESTI-adapted map of the reference spec (built/change/create) |
| [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md) | **Target** — component-based estimation engine: component master, design-stage estimate, auto-BOQ, rate analysis, billing, deviations (phased build); the pre-construction + billing core of Construction Cost OS |
| [IFC-COMPONENT-MAPPING](IFC-COMPONENT-MAPPING.md) | IFC→AORMS component-code mapping standard, quantity formulas, and dependency templates underpinning the component master |
| [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) | Mandatory Pure Carbon UI rules |
| [INDIA-PROFILE](INDIA-PROFILE.md) | INR, FY, GST, TDS, COA, and India constants (reference appendix; live values come from the `profile` tRPC namespace) |
| [LICENSE-NOTICE](LICENSE-NOTICE.md) | Ownership and distribution policy |

Build and runtime instructions live in [DEVELOPMENT.md](../../DEVELOPMENT.md).

Firm-specific practice guides: [docs/holagundi/](../holagundi/README.md).

## Precedence

When documents appear inconsistent, use this order:

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
acceptance gate. Superseded large specs may move to [archive/](archive/README.md).
