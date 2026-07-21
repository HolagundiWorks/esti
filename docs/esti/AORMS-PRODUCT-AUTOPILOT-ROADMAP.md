# AORMS — Product pivot autopilot roadmap

> **Agent queue** for the **2026-07 pricing & surface pivot**: one product, usage
> billing (storage + AI model), **web-only (no desktop apps)**, BYO AI API key,
> legacy licence migration. Canonical product law:
> [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md).
>
> **Human-led (now):** fresh landing pages — rail/stage marketing shell + copy.
> **Autopilot:** everything else below.

**Status markers:** ✅ Done · 🔄 In progress · ⬜ Queued · 🚧 Human-led

---

## How to read this

| Column | Meaning |
|--------|---------|
| **Pri** | P0 = blocks signup/billing truth · P1 = core pivot · P2 = polish |
| **Owner** | `autopilot` · `human` |
| **Verify** | Command or manual check |

**Autopilot rules**

1. Product law is [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — no new LITE/PRO/ENTERPRISE UI.
2. Landing/marketing copy follows rail/stage layout ([HCW-UI-KIT.md](HCW-UI-KIT.md) § Glass Rail — landing uses `esti-lp-rail` / `esti-lp-stage`).
3. **No desktop apps.** AORMS is web-only — do not add Tauri/Electron shells,
   installers, download CTAs, or a standalone Estimate binary. Estimating runs
   in the browser (rate books + BOQ estimates).
4. Update this file when a phase ships.

---

## Status at a glance

| Phase | Focus | Pri | Status | Owner |
|-------|--------|-----|--------|-------|
| [P0](#p0--landing--documentation-human) | Landing + docs (product law) | P0 | ✅ | human |
| [P1](#p1--licence--migration-active) | ACTIVE licence · retire tier enums | P0 | ✅ | autopilot |
| [P2](#p2--storage-metering-5gb-default) | Storage metering · 5 GB default | P0 | ✅ | autopilot |
| [P3](#p3--ai-meter--byo-api-key) | AI usage meter · BYO API key | P1 | ✅ | autopilot |
| [P4](#p4--remove-community--all-desktop-apps) | Remove Community + **all** desktop apps | P1 | ✅ code done; P4.8 marketing copy human-pending | autopilot |
| ~~P5~~ | ~~Estimate desktop auth~~ — **cancelled 2026-07-19** (web-only) | — | ❌ | — |
| [P6](#p6--seo-landing-content-refresh) | SEO markdown landing pages | P2 | ✅ | autopilot |
| [P7](#p7--billing-console--platform-admin) | Platform admin · usage invoices | P2 | ✅ P7.1–P7.3 manual India path | autopilot |
| [P8](#p8--browser-takeoff-replaces-esticad) | Browser takeoff (replaces ESTICAD) | P1 | ✅ | autopilot |
| [P9](#p9--aorms-consultancy-engineering-app) | AORMS-Consultancy (engineering app) | P1 | 🔄 P9.V human fee UX; P9.4 ✅ | autopilot |
| [P10](#p10--2026-07-21-hygiene--rebrand--deps) | Hygiene · rebrand · deps (landed) | P0 | ✅ | autopilot |

---

## P0 — Landing & documentation (human)

**Goal:** Public surfaces tell the new story before code catches up.

| # | Task | Status | Notes |
|---|------|--------|-------|
| P0.1 | Rewrite [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | ✅ | Single product · storage + AI |
| P0.2 | This roadmap | ✅ | |
| P0.3 | Retire Community edition docs | ✅ | Removed — one AORMS Standard licence only |
| P0.4 | Landing hero + pricing (rail/stage) | ✅ | `MarketingShell` + `LandingSections.tsx` |
| P0.5 | FAQ + capability copy | ✅ | `LandingSections.tsx` (FaqSection, CapabilitiesSection) |
| P0.6 | Remove Community/Pro from trial form | ✅ | `LandingTrialForm.tsx` removed |
| P0.7 | Update [README.md](README.md) index blurb | ✅ | |

**Verify:** `GET /` — rail shows Estimate download only; pricing shows storage + AI; no Community/Pro/Enterprise tiles.

**Owner:** human for P0.4–P0.6 visual/copy polish; autopilot may fix broken links after.

---

## P1 — Licence & migration (ACTIVE)

**Goal:** One licence status; legacy tiers map to ACTIVE.

| # | Task | Status |
|---|------|--------|
| P1.1 | Migration SQL: `UPDATE … SET plan = 'ACTIVE'` (or new `licence_status`) for all firms | ✅ `drizzle/0167_licence_status.sql` |
| P1.2 | `packages/contracts` — `LicenceStatus = ACTIVE \| SUSPENDED`; deprecate `Plan` enum | ✅ `contracts/src/plans.ts` |
| P1.3 | `asPlan()` shim → always `ACTIVE` during transition | ✅ `plans.ts` (`planAllows` always true) |
| P1.4 | Platform licence API — issue ACTIVE tokens only | ✅ licensing-platform issues ACTIVE |
| P1.5 | `auth.me` — expose `licenceStatus`, `storageQuotaBytes`, `storageUsedBytes` | ✅ `modules/auth/router.ts` |
| P1.6 | Remove upgrade prompts referencing Community → Pro | ✅ |

**Verify:** Existing demo + prod firms login with full features; no tier chip in UI.

---

## P2 — Storage metering (5 GB default)

| # | Task | Status |
|---|------|--------|
| P2.1 | Default `storageQuotaBytes = 5 GiB` on firm create | ✅ `DEFAULT_STORAGE_BYTES` in contracts |
| P2.2 | Enforce `withinStorage` on upload routes | ✅ `lib/storageQuota.ts` + upload routes |
| P2.3 | Company → Storage usage bar + buy add-on hook | ✅ `CompanyAdminPanel.tsx` + `storagePurchasedBytes` |
| P2.4 | Remove `planAllows` storage tier differences | ✅ shim always-true (`lib/plan.ts`) |
| P2.5 | Archive closed project → reclaim space (existing flow) | ✅ `projectArchive` + `ArchivedProjects.tsx` (export → archive files → reclaim; restore from bundle) |

**Verify:** New signup shows 5 GB; upload blocks at quota with clear error.

---

## P3 — AI meter · BYO API key

| # | Task | Status |
|---|------|--------|
| P3.1 | Firm BYO key stored encrypted (+ base URL + model) | ✅ 2026-07-18 — lives in `org_settings.ai_settings` (`cloudBaseUrl`/`cloudModel`/`cloudApiKey`), key sealed AES-256-GCM via `lib/secretBox.ts` (legacy plaintext auto-migrates on next save). Per-user `users.ai_api_key` column is vestigial/unread — drop in a later cleanup |
| P3.2 | Company → AI — API key form (write-only) | ✅ `AiStudioSettingsPanel.tsx` cloud provider section (blank = keep stored; `cloudApiKeyConfigured` flag) |
| P3.3 | Backend routes prefer firm key; fallback hosted Ollama | ✅ `lib/ai/gateway.ts` `resolveRuntime`; boot no longer wipes cloud config (`ensureOllamaAiSettings` preserve fix, 2026-07-18) |
| P3.4 | Usage counter `ai_tokens_month` (hosted only) | ✅ `ai_tokens_this_month` metering in `modules/ai/router.ts` |
| P3.5 | Settings doc + in-app hint for OpenAI-compatible endpoints | ✅ in-app endpoint-format alert + PLANS-AND-TIERS.md AI section |

**Verify:** Firm key set → calls hit external API; meter increments only when hosted.

---

## P4 — Remove Community + all desktop apps

> **Scope widened 2026-07-19:** the product is **web-only**. This phase now
> removes *every* desktop artifact, not just the Community/Manager packaging.
> The planned Estimate desktop app is cancelled with it (ex-P5, below).

| # | Task | Status |
|---|------|--------|
| P4.1 | Delete `desktop/` (Tauri Manager) + `.github/workflows/desktop.yml` | ✅ 2026-07-19 |
| P4.2 | Drop `marketing.desktopInstallers` API | ✅ | Endpoint removed; `/download` redirects to wiki |
| P4.3 | Remove `ESTI_EDITION=COMMUNITY` first-run seed path (or repurpose) | ✅ 2026-07-18 — `ESTI_EDITION` env removed; `seedCommunity.ts` + `lanInstance.ts` deleted; backup-code recovery kept (`lib/backupCode.ts`); `auth.runtime.edition` pinned `"STANDARD"` |
| P4.4 | Delete/disable `seedCommunity.ts` appliance docs | ✅ 2026-07-18 — no appliance docs remain; PLANS-AND-TIERS keeps only the retirement/migration notice |
| P4.5 | Download page | ✅ `/download` redirects to `/` — permanent, nothing to download |
| P4.6 | Remove `env.DESKTOP` / `IS_DESKTOP` + desktop-token plumbing | ✅ 2026-07-19 — `api-base.ts` collapsed to same-origin; `auth.runtime.desktop`/`mode` kept as deprecated constants so stale clients still parse |
| P4.7 | Purge desktop install/download plumbing: `deploy/fetch-installers.sh`, `VITE_*_DOWNLOAD_URL`, `INSTALLER_REPO`, `@tauri-apps/api`, `frontend/public/manager.html` | ✅ 2026-07-19 |
| P4.8 | Correct docs + published marketing copy claiming a desktop app | 🔄 docs done; **LinkedIn/Instagram campaigns bannered STALE, not rewritten** — replacement copy needs a pricing/positioning decision (human) |
| P4.9 | **Drop ESTICAD** (native CAD companion) | ✅ 2026-07-19 — companion namespace + device-token auth removed; tables dropped 2026-07-21 (`0211`) |

**✅ Resolved 2026-07-19 — browser takeoff.** The ban is **lifted**: measuring in
the browser is now the supported (and only) takeoff path. Note the charter had
already drifted from the code — on-canvas calibrate/measure shipped in
`PlanReaderPanel.tsx` (Plan Measurement Phases 1–3) while the rule still
forbade it. What was actually missing was the last hop, measurement book →
estimate, now shipped as `estimates.importFromMeasurementBook`. See P8.

**Data left in place (not dropped):** ~~the `esti_device_session` table and the
ESTICAD columns on `esti_measurement`~~ — **dropped 2026-07-21** in migration
`0211_drop_legacy_tables.sql` (hygiene pass). `backup_code_hash` dropped with it.

**Behaviour changes shipped with P4.6** (deliberate, both desktop-only paths):
`bootstrap` and self-`register` are now unconditionally refused in production
(a desktop build could previously bypass that; the install seed is the supported
path), and `licenseState.blocked` no longer excepts DESKTOP installs.

**Keep (not desktop):** `FIRM_PLAN` / `applyFirmPlanFromEnv` — dual-purpose, the
surviving consumer is the **self-hosted VPS installer** (`deploy/`).
**ESTICAD:** also dropped (2026-07-19) — see P4.9.

**Verify:** no `tauri`/`IS_DESKTOP`/`DESKTOP` hits outside history; no download CTA.

---

## ~~P5 — Estimate desktop auth · project link~~ — CANCELLED

> **Cancelled 2026-07-19.** AORMS is web-only, so there is no Estimate desktop
> app to authenticate. The `estimate/` directory this phase referenced never
> existed in the repo. Estimating instead ships **in the browser** as part of the
> workspace — rate books and BOQ estimates (`backend/src/modules/estimate/`,
> `backend/src/modules/rateBook/`, `frontend/src/components/ProjectEstimates.tsx`),
> so the `.aormsest` interchange format is unnecessary and is not being built.

---

## P6 — SEO landing content refresh

| # | Task | Status |
|---|------|--------|
| P6.1 | Grep `content/landing/*.md` for Community/Pro/desktop | ✅ no Community/Pro mentions remain |
| P6.2 | Batch replace with storage + web-only narrative | ✅ |
| P6.3 | Sitemap/meta — remove edition keywords | ✅ frontend-wide grep clean |

**Verify:** No "AORMS Community" in top 10 SEO pages.

---

## P7 — Billing console · platform admin

| # | Task | Status |
|---|------|--------|
| P7.1 | Usage dashboard — storage GB-month, AI tokens | ✅ 2026-07-19 — `admin.dashboard.usage` + "Metered usage" panel; **2026-07-21** multi-tenant via `hlp_usage_report` + `POST /v1/report-usage` |
| P7.2 | Manual India invoice export (Stripe deferred) | ✅ 2026-07-21 — `admin.usageReports` list / exportCsv / markBilled; Usage billing tab; `billed_*` on `hlp_usage_report` |
| P7.3 | Suspend on non-payment (manual) | ✅ 2026-07-21 — Usage billing → Suspend for non-payment; node honours `licence_status=SUSPENDED` + refresh stamps from panel 403; Stripe auto-suspend still deferred |

**Scope note (P7).** Product nodes upsert monthly snapshots into `hlp_usage_report`
(`POST /v1/report-usage`, product API key). The platform-admin dashboard aggregates
current-month rows; operators bill offline via **Usage billing** (CSV export + mark
billed) and may **suspend for non-payment**. Stripe remains a future option.

**Verify:** platform-admin → Usage billing → Export CSV → Mark billed → Suspend for non-payment → node refresh blocks writes.

---

## P8 — Browser takeoff (replaces ESTICAD)

**Goal:** quantities measured on a plan in the browser reach an estimate.

| # | Task | Status |
|---|------|--------|
| P8.1 | Render drawings in-browser (DXF→SVG, PDF via PDF.js) | ✅ pre-existing — `PlanReaderPanel.tsx`, `PlanPdfCanvas.tsx` |
| P8.2 | Two-point sheet calibration (pixel→world) | ✅ pre-existing — `esti_sheet_calibration.unitsPerPoint` |
| P8.3 | On-canvas measure/markup tools | ✅ pre-existing — CALIBRATE/MEASURE/WALL/COLUMN/DOOR/WINDOW/RECT |
| P8.4 | Markup → measurement-book rows | ✅ pre-existing — `measurement.deriveFromMarkup` |
| P8.5 | **Measurement book → estimate** | ✅ 2026-07-19 — `estimates.importFromMeasurementBook` + "Send to estimate" |
| P8.6 | Area/polygon measure producing SQM directly | ✅ 2026-07-19 — `AREA` marker + polygon tool; shoelace area, calibration squared |
| P8.7 | Abstract-sheet export (Excel + PDF) | ✅ 2026-07-19/20 — Excel via `buildAbstractExportRows` (unit-tested); PDF via the existing worker render pipeline (`target: "measurement_book"`, ADR-10) |

**Design note — two quantity models, deliberately not merged.** The measurement
book stores integer millimetres with a `MeasurementUom` and derives a rounded SI
quantity; the estimate sheet stores float dimensions and infers a `MeasureShape`
from the item's free-text `unit`. The import **carries the book's derived
quantity across unchanged** (it is what was measured and signed off) rather than
re-deriving through the second model, which would round twice and could silently
disagree. It only checks that both units describe the same kind of measure, and
**refuses the batch on a mismatch** instead of converting. Dimensions are written
in metres so the abstract sheet stays readable. Provenance and idempotency come
from `esti_estimate_measurement.source_measurement_row_id` (migration `0202`).

**Verify:** measure on a plan → select rows → Send to estimate → the item's
quantity and amount update; re-sending updates in place; sqm→cum is refused.

---

## P9 — AORMS-Consultancy (engineering app)

**Goal:** a second workspace on the same spine for engineering consultancies
(structural, MEP, civil) — engagements, a named sign-off/reliance chain, fee &
time commercials, and a risk register. Design lives in
[AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md)
(architecture) and [AORMS-CONSULTANCY-CASE-STUDY.md](AORMS-CONSULTANCY-CASE-STUDY.md)
(sourced operating model). One spine, app-scoped by `hlp_organization.workspace_type`
(**STUDIO** | **CONSULTANCY**).

> **Status audit 2026-07-20 — the design doc is wrong in both directions.** Its
> header claims "all five phases shipped"; its footer calls itself "a design
> draft… every table a proposal until built." Neither matches the code. What is
> actually on `main`: **Phases 0–3 are built** (15 migrations `0183`–`0197`, a
> ~1,200-line `consultancy` router with ~56 procedures, `ConsultancyEngagements.tsx`
> / `ProjectEngagements.tsx`, engagement-register PDF, workspace-type routing in
> the licensing platform). **Phase 4 does not exist** — no precedent search,
> calc-lineage, or capacity-analytics code. And **none of it has a test or a
> review**, in a module with fee stages, variations, WIP and rate cards — exactly
> the money-critical surface where this session's reviews kept finding HIGH bugs.

| # | Task | Status |
|---|------|--------|
| P9.0 | Living record — engagements, disciplines, deliverables register | ✅ built — `0183`, `esti_cons_engagement`/`_deliverable` |
| P9.1 | Reliance engine — named serial sign-off, check categories, EoR, technical queries, issue gating | ✅ built — `0184`, `esti_cons_review_step`/`_comment`/`_tq`/`_reliance_letter` |
| P9.2 | Commercial — fee agreements/stages, timesheets, rate cards, variations, WIP/realisation | ✅ built — `0186`–`0190`, `esti_cons_fee_stage`/`_timesheet`/`_rate_card`/`_variation` |
| P9.3 | Risk — register, insurance (PI + reliance), compliance gates | ✅ built — `0191`, `esti_cons_risk`/`_insurance` |
| P9.3b | Beyond the original plan — typed scope, engagement brief, SOP slices, CRS, field reports | ✅ built — `0192`–`0197` |
| P9.4 | Intelligence — firm-record Q&A + EOMS input-pack review; precedent search; deliverable lineage | ✅ **code-complete 2026-07-21** — `ask` + `eomsReview` + **`precedentSearch`** + **`deliverableLineage`** + **`calcPackages`** + **EOMS compliance UI** + **`analytics.capacityOutlook`** + Ask digest trust boundary (validated packs + capacity alerts) |
| P9.V | **Verify + review the built surface** — money paths (fees/variations/WIP), the sign-off chain's immutability, portal/tenant scoping | 🔄 **in progress 2026-07-21** — pure helpers + **mutation wiring tests** (incl. issue gates for open CRS + RECEIVED input packs); still open: human fee UX review |
| P9.M | Marketing/launch surface — `consultancy.aorms.in`, landing copy | 🔄 landing markdown exists; launch gated on P9.V |

**Risk note.** Phases 0–3 shipping without a test or review is the same setup
that produced the invoice/GST and estimation defects this session. Treat "built"
as "code exists", not "correct" — **P9.V (verify + review) is the real gate**
before this workspace is offered to a paying firm, above finishing P9.4.

**Verify:** create a CONSULTANCY company → open an engagement → run a deliverable
through its sign-off chain → raise a fee stage and a variation → issue is gated
until the chain completes. Automated coverage: pure money/sign-off helpers
(contracts) **and** stubbed-DB mutation wiring (fee advances/locks, issue→BILLABLE,
variation approve race, timesheet rate gate, portal/money redaction). Remaining
gate is human fee UX review (no live-DB Vitest harness in CI).

---

## P10 — 2026-07-21 hygiene · rebrand · deps

Landed on `main` as a batch of merged PRs (branches deleted). Not a product
feature — keeps the spine honest before P9.V / P7 continue.

| # | Task | Status |
|---|------|--------|
| P10.1 | Remove dead `WORKER_MODE=inproc` / desktop worker stub | ✅ |
| P10.2 | Remove `pmcEnabled` flag; site supervision always-on | ✅ + migration `0210` |
| P10.3 | Drop Construction-Cost / orphan schema drift + device sessions | ✅ + migration `0211` |
| P10.4 | Reconcile stale docs; retire DOC-CODE-DRIFT; consultancy contract tests | ✅ |
| P10.5 | Full Playwright e2e job on pull requests | ✅ (PR-gated in `esti-ci`) |
| P10.6 | Major dependency upgrades + audit high+ → 0 | ✅ |
| P10.7 | EmOI → EOMS knowledge-bank rebrand follow-ups (`AORMS-REBRANDING.md` §5) | ✅ |
| P10.8 | Visual Playwright baselines after React 19 / branding | ✅ **fixed 2026-07-21** — suite retargeted to landing (design-system gallery removed in marketing consolidation); linux hero baseline regenerated; visit-counter toasts silenced without a backend |

---

## Execution order

```
P0 (human landing) ──► P1 migration ──► P2 storage
                              │
                              ├─► P3 AI key
                              ├─► P4 remove community + ALL desktop  (✅ code; P4.8 human)
                              ├─► P6 SEO content
                              └─► P7 billing (P7.1–P7.3 manual India ✅)

P5 (Estimate desktop auth) — CANCELLED 2026-07-19, web-only

P8 browser takeoff — ✅

P9 (AORMS-Consultancy) — Phases 0–3 built; **P9.V verify+review ACTIVE**;
   P9.4 intelligence after P9.V

P10 hygiene/rebrand/deps — ✅ landed 2026-07-21 (P10.8 visual baselines ✅)
```

---

## Key files

| Area | Path |
|------|------|
| Product law | `docs/esti/PLANS-AND-TIERS.md` |
| Plans (legacy code) | `packages/contracts/src/plans.ts` |
| Landing shell | `frontend/src/components/landing/MarketingShell.tsx` |
| Landing route | `frontend/src/routes/Landing.tsx` |
| In-browser estimating | `backend/src/modules/estimate/`, `backend/src/modules/rateBook/`, `frontend/src/components/ProjectEstimates.tsx` |
| Consultancy spine | `backend/src/modules/consultancy/router.ts`, `packages/contracts/src/consultancy.ts` (+ `.test.ts`) |
| Firm AI settings | `backend/src/modules/firm/`, `Company.tsx` |
| Rebrand canon | [AORMS-REBRANDING.md](AORMS-REBRANDING.md) |
| UI rail/stage autopilot | [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-21 | Autopilot: **P7 platform usage reporting** — `hlp_usage_report` (migration `0213`), `POST /v1/report-usage`, admin dashboard aggregates current-month reports (local singleton fallback + self-report). |
| 2026-07-21 | Autopilot: **Enquiry register + go/no-go** — `esti_cons_enquiry` (migration `0216`), scorecard + decide + convert→engagement (job code); `/consultancy/enquiries` intake UI.
| 2026-07-21 | Autopilot: **Fee-stage ↔ Studio invoice** — `markInvoiced` raises an ISSUED tax invoice via shared `createStudioInvoice` (GST/TDS/POS), links `esti_cons_fee_stage.invoice_id` (migration `0215`); `markPaid` syncs invoice PAID; engagement UI shows ref + PDF cell. |
| 2026-07-21 | Autopilot: **Transmittal acknowledgment + MDR issue link** — `esti_transmittal` ack fields + `transmittals.acknowledge`; client portal stamps ack; consultancy `recordIssueTransmittal` creates Studio TRN from issued deliverable and back-references on MDR; migration `0214`. |
| 2026-07-21 | Autopilot: **MDR deliverable numbering** — `buildMdrDeliverableCode` / `nextMdrSequence` / validation; create allocates `{job}-{TYPE}-{seq}`; UI doc-type picker with preview; duplicate/wrong-root rejected. |
| 2026-07-21 | Autopilot: **Pre-con R&O on Studio + Consultancy** — Studio `0219` (`esti_project_risk` / opportunity / phase_gate, Brief → R&O tab); Consultancy `0218` engagement registers; shared checklist + response enums. |
| 2026-07-21 | Autopilot: **Pre-con R&O (consultancy)** — opportunity register + design phase gates (`0218`); framework doc maps stakeholder pre-construction brief to adopt/adapt/refuse (no construction PM). |
| 2026-07-21 | Autopilot: **P7.3 manual suspend-for-non-payment** — `admin.usageReports.suspendForNonPayment`; product node `licenseState` blocks on `licence_status=SUSPENDED`; refresh/activate stamp ACTIVE/SUSPENDED from panel; panel refresh interval when `ESTI_LICENSE_API_URL` set. Closeout router tests (contract review gate, lessons, NC/CAPA, MoM). Stripe auto-suspend still deferred. |
| 2026-07-21 | Autopilot: **P9 SOP closeout + P7.2 manual billing** — migration `0217` (lessons · NC/CAPA · MoM · WIP review · contract review · litigation hold; `hlp_usage_report.billed_*`); `consultancy.lessons|ncs|moms|wipReviews|contractReviews`; engagement UI panels; `admin.usageReports` CSV export + mark-billed + Usage billing tab. Stripe deferred; P7.3 still follows payment events. |
| 2026-07-21 | Autopilot: **P9.V issue-gate coverage** — router tests for open CRS comments and RECEIVED input packs blocking ISSUED (sign-off chain already covered). |
| 2026-07-21 | Autopilot: **P9.4 Ask digest trust boundary** — `formatConsultancyDigest` (pure): VALIDATED packs only as working assumptions, RECEIVED as holds (no source text), REJECTED omitted; capacity alerts folded into Ask grounding; unit tests. |
| 2026-07-21 | Autopilot: **P9.4 capacity analytics** — `buildCapacityOutlook` / `capacityOutlookAlerts` + `consultancy.analytics.capacityOutlook`; engagement rail shows TIGHT/OVER alerts from trailing timesheets × rate-card capacity. |
| 2026-07-21 | Autopilot: **P9.4 EOMS compliance UI** — `EomsCompliancePanel` on Knowledge Bank portal (`eoms.status` / sources / resolve / rules); fail-safe offline state. |
| 2026-07-21 | Autopilot: **P9.4 calc-package lineage** — `esti_cons_calc_package` (migration `0212`), `consultancy.calcPackages` CRUD + status advances, engagement detail + lineage summary, contracts helpers/tests. D4: track only, no in-app engine. |
| 2026-07-21 | **EOMS local API on main** (other agent): `packages/contracts/src/eoms.ts` + fail-safe `backend/src/lib/eoms/client.ts` + `eoms.*` tRPC (`status`/`resolve`/`rules`/`clause`/`bundle`/`sources`/`versions`/`library`); `EOMS_API_URL` + compose `host.docker.internal`. Docs: [EOMS-INTEGRATION.md](EOMS-INTEGRATION.md). Autopilot PRs rebase onto this. |
| 2026-07-21 | **P10.8 visual CI fixed:** `/design-system` gallery was removed in marketing consolidation but visual tests still targeted it (scroll timeouts + landing-as-gallery diffs). Suite now asserts landing hero only; linux baseline regenerated in Playwright `v1.49.0-jammy`; `landing-visit` health/record toasts marked `silent` so preview-without-backend stays clean. |
| 2026-07-21 | Autopilot go: **P9.V mutation wiring** — `backend/src/modules/consultancy/router.test.ts` (17 cases): fee advances/locks, issue→BILLABLE fire, review independence, variation approve race + delete block, timesheet rate gate + money redaction, portal/capability scoping. Remaining P9.V gate: human fee UX review. |
| 2026-07-21 | Autopilot go: shipped **precedentSearch** + **deliverableLineage** (pure rank/lineage helpers + tRPC + Find precedents UI in Ask intelligence). P9.4 advanced. |
| 2026-07-21 | Autopilot continue: wired `mayIssueDeliverable` + deliverable/variation lifecycle helpers into the consultancy router; marked **P2.5 ✅** (project file archive reclaim already shipped); P9.4 corrected to partial (intelligence ask + EOMS pack review exist). Contracts tests 267. |
| 2026-07-21 | **P10 hygiene/rebrand/deps landed on main** (inproc/PMC/schema drift, docs, e2e CI, major deps, EmOI→EOMS). **P9.V started:** extracted pure money + sign-off helpers into contracts, wired into the consultancy router, expanded unit tests. Glance: P4 → code-done; P9 → P9.V in progress. P4 device-session tables noted dropped via `0211`. |
| 2026-07-20 | Added **P9 — AORMS-Consultancy** to the roadmap. Audited against code, not the design doc (which self-contradicts): Phases 0–3 are built (migrations `0183`–`0197`, ~1,200-line `consultancy` router, engagement UI + PDF, workspace-type routing); Phase 4 (intelligence) does not exist; the whole surface has zero tests and no review. Added P9.V (verify + review) as the real gate — this is the same money-critical-but-untested shape that produced the invoice/GST and estimation HIGH bugs this session. Also added the missing P8 row to the glance table. |
| 2026-07-18 | Status audit vs code: P1/P2/P6 detail rows ticked (shipped but never checked off); P3 and P4 downgraded ✅→🔄 (BYO key unwired; desktop Manager + `ESTI_EDITION` still present); P5 marked blocked — `estimate/` app absent from repo. |
| 2026-07-18 | P4.3/P4.4 shipped: Community edition code removed (`ESTI_EDITION`, `seedCommunity.ts`, `lanInstance.ts`, portal-login refusal); backup-code recovery kept via `lib/backupCode.ts`. P4.5 confirmed (no download page). Remaining P4: Manager teardown (P4.1 + P4.6). |
| 2026-07-20 | P8.7 completed with a printable abstract PDF, reusing the worker render pipeline rather than adding a second one. Verifying it surfaced a **pre-existing demo-seed bug**: `clearDemoWorkspace` wipes under `session_replication_role = 'replica'`, which disables FK triggers — so `ON DELETE CASCADE` never fires and every forced re-seed orphaned project-scoped rows. Invisible in the UI (queries join through the project) but reachable by id, so a queued render failed with "not found". The wipe now removes project-scoped books/estimates explicitly and sweeps existing orphans. |
| 2026-07-19 | P8.6 shipped: an `AREA` marker measures the **enclosed polygon** (shoelace), not L×B — an L-shaped room's bounding box overstates it. Calibration is linear so area scales by its **square**; multiplying once under-reports by ~100× at 1:100. Both are pinned by tests, and verified end to end: an L-shape that would bbox to 1.0 SQM derives 0.75 SQM, and an open shape stores null rather than a plausible wrong number. |
| 2026-07-19 | P8.5 verified in-browser against seeded demo data (`seedDemoTakeoff`), which exposed float drift on the estimate total — quantities now round to 3 dp. P8.7 shipped: Excel abstract export with per-UOM totals, shaped by a unit-tested pure function in contracts. Dev stack given `restart: unless-stopped` so WSL recycles stop taking it down. |
| 2026-07-19 | **Browser-geometry ban lifted; P8 browser takeoff.** Corrected a charter/code drift — on-canvas calibrate+measure had already shipped while the charter still forbade it. Built the one genuinely missing hop: `estimates.importFromMeasurementBook` (migration `0202`) plus "Send to estimate" in the measurement panel. The book's quantity is carried across unchanged and a unit mismatch is refused, never converted. Also corrected a stale premise: `esti_measurement` (the ESTICAD table) has no readers and is not the estimate bridge — `esti_estimate_measurement` is. |
| 2026-07-19 | P4.9: **ESTICAD dropped.** Removed the `companion` tRPC namespace, device-token bearer auth, `ai.generateCad` + the 8 CAD draft kinds, `drawings.setScale`, `esticadLink.ts`, the Connected Devices panel, and ~217 lines of orphaned landing SCSS. `esti_device_session` and the `esti_measurement` ESTICAD columns are left in the DB deliberately. Verified: the scale columns had no reader, and `esti_ai_run` is empty, so narrowing the kind enum is runtime-safe. Leaves an open decision on quantity takeoff. |
| 2026-07-19 | P4.1/P4.6/P4.7 shipped: `desktop/` (26 files), `desktop.yml`, `fetch-installers.sh`, `manager.html`, `env.DESKTOP`, `IS_DESKTOP` + bearer-token plumbing, `@tauri-apps/api`, and all `VITE_*_DOWNLOAD_URL`/`INSTALLER_REPO` removed. Verified with a real browser login through tenant-select into the workspace on cookie auth. |
| 2026-07-19 | **Product direction: web-only — no desktop apps.** P5 (Estimate desktop auth) cancelled outright; P4 widened to remove every desktop artifact (Manager/Tauri, installers, download plumbing, `env.DESKTOP`/`IS_DESKTOP`). PLANS-AND-TIERS updated: the licence table now states "Desktop: None". `FIRM_PLAN` explicitly retained — the VPS installer, not the desktop app, is its surviving consumer. ESTICAD (native CAD companion) deliberately left out of scope. |
| 2026-07-19 | P7.1 shipped: `admin.dashboard.usage` (storage used/quota incl. add-on, hosted AI tokens) + "Metered usage" panel on the platform-admin dashboard. Stale-month token counters correctly report 0, matching the AI router's lazy reset. Verified via tRPC caller against real rows (current/stale/null month) with admin, non-admin, and anonymous contexts. Documented the single-tenant scope limit that blocks P7.2. |
| 2026-07-18 | P3 complete: BYO key now sealed at rest (AES-256-GCM, `lib/secretBox.ts`, keyed from `SESSION_SECRET`); fixed boot bug where `ensureOllamaAiSettings` wiped firm cloud config + key on every backend restart; stale Enterprise-only gate removed from `ai.setSettings`. E2E verified: key sealed in DB (`enc:v1:…`), survives restart, redacted from reads. |
| 2026-07-09 | Roadmap created. Product pivot: no tiers; storage + AI pricing; Estimate-only desktop; ACTIVE licence migration. |
