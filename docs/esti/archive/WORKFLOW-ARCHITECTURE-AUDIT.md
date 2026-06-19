> **ARCHIVED** — Snapshot / superseded. Do not use as implementation authority.
> Current status: [ROADMAP](../ROADMAP.md). Original path: docs/esti/WORKFLOW-ARCHITECTURE-AUDIT.md.

# ESTI Workflow, Component Hierarchy & Architecture Audit

**Status:** Snapshot · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-15

Execution of findings is tracked in [ROADMAP Phase 2G](../ROADMAP.md). This document
is an archived snapshot; the roadmap remains the authoritative delivery plan.

Related: [ARCHITECTURE](../ARCHITECTURE.md), [ARCHITECT-PROFILE](../ARCHITECT-PROFILE.md),
[CARBON-UI-DIRECTION](../CARBON-UI-DIRECTION.md).

---

## Executive summary

ESTI/AORMS is a **modular monolith** with a sound layer split: Carbon SPA →
Fastify/tRPC → PostgreSQL, MinIO/S3 binaries, Redis → Python worker. The
**Dashboard**, **Work**, and **Project detail** hubs are the reference UI
pattern.

Main gaps: **IA drift** (legacy paths, orphan files, URL/label mismatches),
**uneven activity emission** vs broad audit coverage, and a **migration journal
defect** (0031 skipped). External portals use stateful SPAs without deep links.

| Area | Grade | Headline |
|------|-------|----------|
| System architecture | A- | Clear layers; contracts + worker boundary |
| Backend modularity | B+ | ~60 tRPC namespaces; fat read-model routers |
| Frontend component hierarchy | B | Good primitives; route/component blur |
| Staff workflow IA | B+ | Side nav coherent; path/label mismatches |
| Portal workflows | B | Functional; deep linking still needed |
| Doc ↔ code alignment | B- | Some stale deep links (being fixed in 2G) |

---

## 1. System architecture

### 1.1 Runtime topology

```text
Carbon React SPA
       |
       | tRPC + restricted REST uploads
       v
Fastify/TypeScript backend ---- PostgreSQL (system of record)
       |        |
       |        +---- MinIO/S3 (content-addressed binaries)
       |
       +---- Redis Streams ---- Python worker (DXF, PDF, imports)
```

TypeScript owns domain rules, money, auth, and audit. The worker patches
artifacts (`pdf_key`, `svg_key`, reconcile lines) only.

### 1.2 Repository layers

| Layer | Location | Role |
|-------|----------|------|
| Contracts | `packages/contracts` | Zod, permissions, labels, tax — shared SPA + API |
| Backend modules | `backend/src/modules/*` | Domain routers; no cross-module imports |
| Shared kernel | `backend/src/lib/*` | Audit, activity, S3, Redis, scope guards |
| Frontend routes | `frontend/src/routes/*` | Page modules |
| Frontend components | `frontend/src/components/*` | Reusable + domain panels |

### 1.3 tRPC namespace clusters

| Cluster | Namespaces (sample) | Tables |
|---------|---------------------|--------|
| Identity & org | `auth`, `users`, `firm`, `settings`, `audit` | `esti_user`, `esti_firm`, … |
| CRM & projects | `projectOffice`, `decisions`, `criticalNotes`, `activity` | `esti_projectoffice`, `esti_decision`, … |
| Delivery | `tasks`, `drawings`, `approvals`, `transmittals` | `esti_task`, `esti_drawing`, … |
| Commercial | `invoices`, `feeProposals`, `reconcile`, `reports` | `esti_invoice`, … |
| People & HR | `team`, `leaves`, `payroll`, `timesheets`, `aspRf` | `esti_teammember`, … |
| External | `portal`, `collab`, `clientRequests`, `tenders` | portal/consultant submissions, tenders |
| Knowledge | `ruleVersions`, `siteAssessments`, `knowledgeBank`, `steelflow` | RIE + `sf_*` |
| Read models | `dashboard`, `notifications` | Cross-table joins; alerts not persisted |

**Procedure ladder:** `public` → `authed` → `protected` → `capabilityProcedure` /
`ownerProcedure` → `clientProcedure` / `collaboratorProcedure`.

### 1.4 Cross-cutting concerns

| Concern | Coverage |
|---------|----------|
| Audit (`lib/audit.ts`) | Broad — most privileged mutations |
| Activity (`lib/activity.ts`) | Partial — Activity Center incomplete for many domains |
| REST uploads | Drawing, reconcile, firm logo, mood image |
| Worker | `dxf_to_svg`, `render_pdf`, `reconcile_import` |

### 1.5 Infrastructure defect (P0)

`backend/drizzle/meta/_journal.json` previously jumped **0030 → 0032**, skipping
**`0031_tender_bids.sql`**. Fresh installs would miss `esti_tender_bid`. Fixed in
Phase 2G.

---

## 2. Component & tool hierarchy

### 2.1 Intended layering

```text
App.tsx (auth + nav)
  └── routes/* (pages)
        └── components/* (panels + primitives)
              └── lib/* (trpc, auth, helpers)
```

**Deviations:** `KnowledgeBank` imports route files as tab panels; `Work.tsx` is a
monolith; deprecated route files removed; KB/Work panels extracted to
`components/knowledge/` and `components/work/`.
on disk.

### 2.2 Component taxonomy

| Tier | Examples | Role |
|------|----------|------|
| Shell | `PageHeader`, `PortalHeader`, `FloatingDock`, `AlertsBell` | Chrome |
| Primitives | `DataState`, `ConfirmModal`, `SubmissionThread` | Loading/empty/confirm |
| Intelligence | `QualityIntelligenceTiles`, `RevisionTransitionPreview` | Dashboard + landing |
| Project workspace | `ProjectOverview`, `ProjectDrawings`, … (11 panels) | `/projects/:id` tabs |
| Knowledge | `RuleVersionManager`, `SiteAssessmentPanel`, `SteelArranger` | KB tabs |
| PDF cells | `InvoicePdfCell`, `FeeProposalPdfCell`, … | Table status columns |

### 2.3 Reference patterns

| Pattern | Example | Blocks |
|---------|---------|--------|
| Staff list | `Clients.tsx` | `PageHeader` → `DataState` → table → modal |
| Tab hub | `Work.tsx`, `KnowledgeBank.tsx` | URL `?tab=` + Carbon `Tabs` |
| Project hub | `ProjectDetail.tsx` | `/projects/:id?tab=` → `Project*` panels |
| Portal SPA | `Portal.tsx` | `PortalHeader` + `openId` state |

### 2.4 Staff tools

| Tool | Entry | Notes |
|------|-------|-------|
| Side nav | Rail | Primary IA |
| Header clock / Pomodoro / Alerts bell | Header | Personal + alerts modal |
| Floating dock | Bottom | Theme, calculator, admin module toggles |
| `/settings` vs dock | Split | Profile vs firm module flags — no cross-link |

---

## 3. Workflow audit

### 3.1 Persona shells

| Persona | Routing | Bookmarkable |
|---------|---------|--------------|
| Visitor | Landing, `/login` | Yes |
| Staff | Full React Router | Yes (mostly) |
| Client | Single page (`openId`) | No |
| Consultant | Single page (`openId`) | No |

### 3.2 Tab-hub URL contracts

| Module | Base | Tab slugs |
|--------|------|-----------|
| Work | `/tasks` | `tasks`, `board`, `workload`, `activity`, `client-requests`, `consultant-requests`, `attendance` |
| Knowledge Bank | `/knowledge-bank` | `dsr`, `compliance`, `specification`, `steelflow` |
| Project | `/projects/:id` | `overview`, `drawings`, `settings`, … |

Legacy redirects: `/activity`, `/workload`, `/dsr`, `/steel-arranger` → consolidated hubs.

### 3.3 Staff daily path (intended)

Dashboard → Action Center / KPI chips → Projects or Work → project CRIF ledger /
drawings / invoices. Knowledge Bank compliance tab for RIE assessments.

### 3.4 IA mismatches

| Nav label | URL | Issue |
|-----------|-----|-------|
| Work | `/tasks` | Label vs path |
| My profile | `/settings` | Admin group vs settings path |
| Fee proposals vs Proposals | `/accounting/fees` vs `/office/proposals` | Same word, different domains |

---

## 4. Findings (prioritized)

### P0 — Data integrity / broken navigation

1. Migration journal missing **0031_tender_bids** — fixed Phase 2G.
2. `/compliance` route opened DSR tab, not compliance — fixed Phase 2G.
3. `ProjectOverview` deep links to `/activity` and `/compliance?project=` — fixed Phase 2G.
4. Knowledge Bank project selector dropped `tab` query param — fixed Phase 2G.

### P1 — Workflow & information architecture

5. Portals have no deep links — **fixed:** `/projects/:projectId` on client and consultant portals.
6. `/alerts` page not in side nav — **fixed** Phase 2G.
7. Side nav exact-match — **fixed** Phase 2G.
8. Settings split across `/settings` and FloatingDock — **cross-linked** Phase 2G.

### P2 — Code hygiene

9. Delete deprecated route files — **done** Phase 2G.
10. Wire or delete orphan `ProjectPermits`, `ProjectBylaws`, `ProjectBylawCalc`, `ClockLeavesWidget` — **fixed:** KB compliance tab + dashboard clock widget.
11. Extract KB embeds from `routes/` to `components/` — **fixed:** `components/knowledge/`.
12. Split `Work.tsx` tab panels — **fixed:** `components/work/`.
13. Extend activity emission to remaining audited domains — **fixed:** invoice, PO, drawing writes.

### P3 — Architecture evolution

14. Slice monolithic `schema.ts` by domain — **fixed:** `backend/src/db/schema/`.
15. Thin fat routers (`dashboard`, `projectOffice`) — **fixed:** readModels + queries.
16. Document or align `sf_*` vs `esti_*` naming — **fixed:** `STEELFLOW-BOUNDED-CONTEXT.md`.
17. Optional snapshot tables for notifications / ASPRF history — **deferred** Phase 5.
18. Domain event bus when module count grows.

---

## 5. Remediation sequence

See [ROADMAP Phase 2G](ROADMAP.md) for checklist and gates.

```text
P0 (journal + routing) → P1 (nav + portals) → P2 (orphans + structure) → P3 (schema/events)
```
