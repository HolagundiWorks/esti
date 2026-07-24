# AORMS Implementation Roadmap

**Status:** Canonical · **Updated:** 2026-07-24  
**Product / UI autopilot:** **COMPLETE** — human gates only below.

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. Retired modules
(Estimation OS, Construction Cost spine, PMC hub, legacy Rate Books/`dsr`, etc.)
are **not** current product state — see system state below.

This is the **single** delivery roadmap. Superseded autopilot / audit / fix-plan
docs were removed 2026-07-24 (Git history retains them).

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming (platform · apps · EOMS · ESTI) |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md) | **P9.V** human sign-off checklist |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O law |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP ↔ product |
| [AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md) | Consultancy system design |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | Shipping — this monorepo; pre-con R&O on Brief → R&O |
| **AORMS-Consultancy** (engineering) | Code-complete (SOP + R&O + fee UX); **P9.V** walkthrough + **P9.M** launch gated |

## Completed tracks (2026-07)

| Track | Outcome |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · web-only · BYO AI key · browser takeoff · hygiene/rebrand/deps |
| **P7 billing** | Multi-tenant usage · CSV + mark-billed · suspend-for-non-payment (Stripe auto deferred) |
| **P9 Consultancy** | Engagements · reliance · fees · SOP closeout · enquiry · fee-stage invoices · intelligence (`0214`–`0219`) |
| **Pre-con R&O** | Consultancy + Studio phase gates |
| **UI shell U0–U6** | Glass rail · stage · ActionDock · marketing shell |
| **@hcw/ui-kit 1.4.0** | Vendored + app shell adoption |
| **Blog / SEO** | `/blog` live; feed/sitemap refreshed |
| **HCW License Manager** | In-tree (`admin.aorms.in`) |

## Next (human-gated / deferred)

1. **P9.V** — [Consultancy walkthrough](P9V-CONSULTANCY-WALKTHROUGH.md) sign-off
2. **P9.M** — public launch of `consultancy.aorms.in` (gated on P9.V Pass)
3. **Stripe auto-billing / auto-suspend** — deferred; manual India path ships

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves), and **this
file** in the same pull request. **Do not** keep superseded specs in the tree —
delete them; Git history is the archive.
