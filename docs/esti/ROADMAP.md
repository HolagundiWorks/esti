# AORMS Implementation Roadmap

**Status:** **COMPLETE** · **Updated:** 2026-07-24

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. **AORMS-Consultancy**
is **live** (P9.V verified · P9.M marketing ungated). Stripe auto-billing remains
**deferred by choice** — the manual India usage-billing path ships.

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
| [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md) | P9.V acceptance checklist (signed) |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O law |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP ↔ product |
| [AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md) | Consultancy system design |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | **Live** — `studio.aorms.in` |
| **AORMS-Consultancy** (engineering) | **Live** — `consultancy.aorms.in` (P9.V ✅ · P9.M ✅) |

## Completed tracks (2026-07)

| Track | Outcome |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · web-only · BYO AI key · browser takeoff · hygiene/rebrand/deps |
| **P7 billing** | Multi-tenant usage · CSV + mark-billed · suspend-for-non-payment (Stripe auto deferred) |
| **P9 Consultancy** | Engagements · reliance · fees · SOP · enquiry · fee-stage invoices · intelligence (`0214`–`0219`) |
| **P9.V** | Money/sign-off mutation suite + fee UX polish; walkthrough checklist signed 2026-07-24 |
| **P9.M** | Marketing ungated — `AORMS_APPS.consultancy.status = live`; landing CTAs; SEO/blog/docs |
| **Pre-con R&O** | Consultancy + Studio phase gates |
| **UI shell U0–U6** | Glass rail · stage · ActionDock · marketing shell |
| **@hcw/ui-kit 1.4.0** | Vendored + app shell adoption |
| **Blog / SEO** | `/blog` live; feed/sitemap refreshed |
| **HCW License Manager** | In-tree (`admin.aorms.in`) |

## Deferred (by choice — not blocking)

1. **Stripe auto-billing / auto-suspend** — manual India usage-billing path is the shipping path

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves), and **this
file** in the same pull request. **Do not** keep superseded specs in the tree —
delete them; Git history is the archive.
