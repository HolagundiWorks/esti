# ESTI Documentation

**Status:** Canonical index · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

This directory is the single source of truth for ESTI product and engineering
direction. Historical audits were removed after their unresolved findings were
incorporated into the roadmap; they must not compete with current requirements.

## Canonical Documents

| Document | Authority |
| --- | --- |
| [PRODUCT-VISION](PRODUCT-VISION.md) | Product purpose, users, and boundaries |
| [PRD](PRD.md) | Functional and non-functional requirements |
| [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md) | Module registry and workflow model |
| [ARCHITECTURE](ARCHITECTURE.md) | Stack, security model, data ownership, ADRs |
| [ROADMAP](ROADMAP.md) | Current status, gaps, sequence, and acceptance gates |
| [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) | Mandatory Pure Carbon UI rules |
| [INDIA-PROFILE](INDIA-PROFILE.md) | INR, FY, GST, TDS, COA, and India constants |
| [BYLAWS-BBMP](BYLAWS-BBMP.md) | BBMP bylaw reference |
| [LICENSE-NOTICE](LICENSE-NOTICE.md) | Ownership and distribution policy |

Build and runtime instructions live in [DEVELOPMENT.md](../../DEVELOPMENT.md).

## Precedence

When documents appear inconsistent, use this order:

1. `PRODUCT-VISION.md` for product boundary.
2. `PRD.md` for required behaviour.
3. `ARCHITECTURE.md`, `INDIA-PROFILE.md`, and `CARBON-UI-DIRECTION.md` for
   implementation constraints.
4. `ROADMAP.md` for delivery status and order.

“Implemented” means code exists and has passed the roadmap verification gate.
“Planned” means it is required but not yet delivered. Documentation must not
describe planned behaviour as already available.

## Change Rule

Every material feature change updates the PRD/module profile and roadmap in the
same pull request. Architecture, tax, or UI-policy changes also update their
canonical document. Point-in-time audit files should not be added; findings go
directly into the roadmap backlog with an owner, priority, and acceptance gate.
