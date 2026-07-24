# AORMS Implementation Roadmap

**Status:** COMPLETE · **Updated:** 2026-07-24  
**Platform build:** COMPLETE (P0–P10 · P9.V · P9.M)  
**Market-fit waves:** COMPLETE (W1–W3) · **W4 integrations deferred** — see [MARKET-FIT.md](MARKET-FIT.md)

Phases 0–28 are **engineering-complete** for **AORMS-Studio**. **AORMS-Consultancy**
is **live**. Stripe auto-billing remains **deferred by choice**. Market-fit Waves
1–3 are **shipped**; Wave 4 (integrations) stays phase-2 by design.

This is the **single** delivery roadmap. Superseded autopilot / audit / fix-plan
docs were removed 2026-07-24 (Git history retains them).

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [MARKET-FIT.md](MARKET-FIT.md) | **GTM + market-fit backlog** (ICP, competitors, waves) |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming (platform · apps · EOMS · ESTI) |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md) | P9.V acceptance checklist (signed) |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O law |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP ↔ product |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AORMS-Studio** (architecture) | **Live** — `studio.aorms.in` |
| **AORMS-Consultancy** (engineering) | **Live** — `consultancy.aorms.in` (P9.V ✅ · P9.M ✅) |

## Market fit queue

Canonical brief: **[MARKET-FIT.md](MARKET-FIT.md)**.

### Wave 1 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W1.1 | Align Vendors nav gate with route (`atLeast(60)`) | Hygiene | ✅ |
| W1.2 | Scrub SEO landings claiming PMC / running bills as product | M5 GTM | ✅ |
| W1.3 | Scrub Ask ESTI wiki-knowledge (Estimation OS / Item library / plan-gated AI) | M5 GTM | ✅ |
| W1.4 | Landing `#pricing` + FAQ from Standard licence law | M5 GTM | ✅ |
| W1.5 | Client portal empty states + pending-approval strip | M3 Portal | ✅ |
| W1.6 | Studio Financial KPIs: fee recovery % | M1 Money | ✅ |

### Wave 2 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W2.1 | First-invoice onboarding (Studio empty-firm checklist + proposal/invoice CTAs) | M1 Money | ✅ |
| W2.2 | Studio Intelligence capacity strip (overload · busy · attendance) | M2 Capacity | ✅ |
| W2.3 | Notification digests in Alerts bell (top digest lines) | M3 Portal | ✅ |

### Wave 3 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W3.1 | Consultancy workspace chrome (Enquiries · Engagements ribbon + footer home) | M6 Consultancy | ✅ |
| W3.2 | Engagement→invoice demo seed (`EQ-DEMO-001` → `C-DEMO-001` BILLABLE stage) | M6 Consultancy | ✅ |
| W3.3 | Reference-firm packaging (Holagundi DEMO-SCRIPT + ICP-ONE-PAGER) | M5 / M6 | ✅ |

### Wave 4 — deferred (phase 2)

| Wave | Focus | Status |
|---|---|---|
| **W4** | Integrations (Tally / Drive / WhatsApp capture) | **Deferred** — not day-one |

### Tracks (from MARKET-FIT)

| ID | Track | Goal |
|---|---|---|
| M1 | Trust & money | Fee recovery visibility · invoice reliability · first-invoice onboarding |
| M2 | Time & capacity | Time → WIP → fee; overload signals |
| M3 | Client-facing proof | Portal polish · decision digests |
| M4 | India differentiation | COA/GST excellence · R&O · revision intelligence |
| M5 | GTM packaging | Consistent story · pricing · Ask ESTI truth |
| M6 | Consultancy GTM | Chrome · demos · references |
| M7 | Integrations | Phase 2 |

## Completed tracks (2026-07)

| Track | Outcome |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · web-only · BYO AI key · browser takeoff · hygiene/rebrand/deps |
| **P7 billing** | Multi-tenant usage · CSV + mark-billed · suspend-for-non-payment (Stripe auto deferred) |
| **P9 Consultancy** | Engagements · reliance · fees · SOP · enquiry · fee-stage invoices · intelligence (`0214`–`0219`) |
| **P9.V / P9.M** | Walkthrough signed · marketing live |
| **Pre-con R&O** | Consultancy + Studio phase gates |
| **UI shell U0–U6** | Glass rail · stage · ActionDock · marketing shell |
| **@hcw/ui-kit 1.4.0** | Vendored + app shell adoption |
| **Blog / SEO** | `/blog` live; feed/sitemap refreshed |
| **HCW License Manager** | In-tree (`admin.aorms.in`) |
| **Market fit W1–W3** | GTM scrub · portal · fee recovery · onboarding · capacity · digests · consultancy chrome · demo seed · packaging |

## Deferred (by choice — not blocking)

1. **Stripe auto-billing / auto-suspend** — manual India usage-billing path is the shipping path  
2. **Desktop apps / direct cloud DB clients** — web-only system of record  
3. **Construction tenders / RA bills / BBS** — outside advisory scope  
4. **W4 integrations** (Tally / Drive / WhatsApp capture) — phase 2 after first paying firms  

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves),
[MARKET-FIT.md](MARKET-FIT.md) (if GTM priority moves), and **this file** in the
same pull request. **Do not** keep superseded specs in the tree — delete them;
Git history is the archive.
