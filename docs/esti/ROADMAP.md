# AORMS Implementation Roadmap

**Status:** Canonical pointer · **Updated:** 2026-07-22

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. Retired modules
(Estimation OS, Construction Cost spine, PMC hub, legacy Rate Books/`dsr`, etc.)
are **not** current product state — see system state below.

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) | **Active product implementation queue** |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O — Studio + Consultancy (adopt / adapt / refuse) |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP product map |
| [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) | Glass-rail + marketing shell (U0–U6 ✅) |
| [AORMS-REBRANDING.md](AORMS-REBRANDING.md) | EmOI → EOMS / knowledge-bank nomenclature |
| [PRD.md](PRD.md) | Requirements (cross-check against System state above) |

## Platform apps (2026-07-22)

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | Shipping — this monorepo; pre-con R&O on Brief → R&O |
| **AORMS-Consultancy** (engineering) | Core + SOP + R&O **code-complete**; fee UX polish landed; **P9.V** human walkthrough + **P9.M** launch still gated |

## Recent landings (2026-07-21 → 22)

| Track | Outcome |
| --- | --- |
| Legacy cleanup / deps / rebrand | `WORKER_MODE=inproc` + PMC flag + schema drift removed; major deps; EmOI→EOMS; EOMS API; P10.8 visual baselines |
| **P7 billing** | ✅ P7.1 multi-tenant usage · P7.2 CSV + mark-billed · P7.3 suspend-for-non-payment (Stripe auto-billing deferred by choice) |
| **P9 SOP** | ✅ Transmittal ack · fee-stage Studio invoices · enquiry go/no-go · closeout (lessons · NC/CAPA · MoM · WIP · contract review · litigation hold) — migrations `0214`–`0217` |
| **Pre-con R&O** | ✅ Shared framework — Consultancy `0218` + Studio `0219` (risk · opportunity · design phase gates) |
| **P4.8** | ✅ Web-only LinkedIn/Instagram campaign copy |
| **P9.V polish** | ✅ Fee UX — toasts, confirms, Edit terms, locked delete (human walkthrough remains) |

## Next (human-gated / deferred)

1. **P9.V** — human fee/variation/WIP walkthrough sign-off (autopilot polish done)
2. **P9.M** — public launch of `consultancy.aorms.in` (gated on P9.V)
3. **Stripe auto-billing / auto-suspend** — deferred by choice; manual India path is the shipping path

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves), and the
relevant autopilot roadmap in the same pull request. **Do not** keep superseded
specs in the tree — delete them; Git history is the archive.
