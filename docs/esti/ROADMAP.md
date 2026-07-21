# AORMS Implementation Roadmap

**Status:** Canonical pointer · **Updated:** 2026-07-21

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. Retired modules
(Estimation OS, Construction Cost spine, PMC hub, legacy Rate Books/`dsr`, etc.)
are **not** current product state — see system state below.

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) | **Active product implementation queue** |
| [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) | Glass-rail + marketing shell (U0–U6 ✅) |
| [AORMS-REBRANDING.md](AORMS-REBRANDING.md) | EmOI → EOMS / knowledge-bank nomenclature |
| [PRD.md](PRD.md) | Requirements (cross-check against System state above) |

## Platform apps (2026-07-21)

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | Shipping — this monorepo |
| **AORMS-Consultancy** (engineering) | Built (Phases 0–3); **P9.V verify+review in progress** — see product autopilot |

## Recent hygiene (2026-07-21) — landed on `main`

| Track | Outcome |
| --- | --- |
| Legacy cleanup | Removed `WORKER_MODE=inproc`, PMC flag, schema drift (Construction-Cost orphans, device sessions); docs reconciled; full Playwright e2e job on PRs |
| Deps | Major upgrades (drizzle 0.45, Fastify 5, zod 4, React 19, vite 8, …); audit high+ **0** |
| Rebrand | EmOI → **EOMS** knowledge-bank framing (`AORMS-REBRANDING.md` §5 done) |
| EOMS API | Local compliance Knowledge Bank client wired (`eoms.*` tRPC, fail-safe) — see [EOMS-INTEGRATION.md](EOMS-INTEGRATION.md) |

## Next (product autopilot)

1. **P9.V** — human fee UX review (mutation wiring tests landed; pure helpers + router stubs green)
2. **P9.4** — deepen consultancy intelligence (calc-package model); optional: surface `eoms.*` compliance reads in UI after P9.V
3. **P4.8** — human: replace stale social/campaign desktop copy
4. **P7.2** — billing (blocked on Stripe vs manual invoice decision)
5. **P10.8** — ✅ visual suite retargeted + linux baselines regenerated (2026-07-21)

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves), and the
relevant autopilot roadmap in the same pull request. **Do not** keep superseded
specs in the tree — delete them; Git history is the archive.
