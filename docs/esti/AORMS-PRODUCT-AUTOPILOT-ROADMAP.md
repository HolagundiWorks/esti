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
| [P4](#p4--remove-community--all-desktop-apps) | Remove Community + **all** desktop apps | P1 | 🔄 | autopilot |
| ~~P5~~ | ~~Estimate desktop auth~~ — **cancelled 2026-07-19** (web-only) | — | ❌ | — |
| [P6](#p6--seo-landing-content-refresh) | SEO markdown landing pages | P2 | ✅ | autopilot |
| [P7](#p7--billing-console--platform-admin) | Platform admin · usage invoices | P2 | 🔄 | autopilot |

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
| P2.5 | Archive closed project → reclaim space (existing flow) | ⬜ |

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
| P4.1 | Delete `desktop/` (Tauri Manager) + `.github/workflows/desktop.yml` | ⬜ |
| P4.2 | Drop `marketing.desktopInstallers` API | ✅ | Endpoint removed; `/download` redirects to wiki |
| P4.3 | Remove `ESTI_EDITION=COMMUNITY` first-run seed path (or repurpose) | ✅ 2026-07-18 — `ESTI_EDITION` env removed; `seedCommunity.ts` + `lanInstance.ts` deleted; backup-code recovery kept (`lib/backupCode.ts`); `auth.runtime.edition` pinned `"STANDARD"` |
| P4.4 | Delete/disable `seedCommunity.ts` appliance docs | ✅ 2026-07-18 — no appliance docs remain; PLANS-AND-TIERS keeps only the retirement/migration notice |
| P4.5 | Download page | ✅ `/download` redirects to `/` — permanent, nothing to download |
| P4.6 | Remove `env.DESKTOP` / `IS_DESKTOP` + desktop-token plumbing | ⬜ |
| P4.7 | Purge desktop install/download plumbing: `deploy/fetch-installers.sh`, `VITE_*_DOWNLOAD_URL`, `INSTALLER_REPO`, `@tauri-apps/api`, `frontend/public/manager.html` | ⬜ |
| P4.8 | Correct docs + published marketing copy claiming a desktop app | ⬜ |

**Keep (not desktop):** `FIRM_PLAN` / `applyFirmPlanFromEnv` — dual-purpose, the
surviving consumer is the **self-hosted VPS installer** (`deploy/`).
**Out of scope:** ESTICAD, the separate native CAD companion — retiring it is an
independent product decision, not part of this phase.

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
| P7.1 | Usage dashboard — storage GB-month, AI tokens | ✅ 2026-07-19 — `admin.dashboard.usage` + "Metered usage" panel on the platform-admin dashboard |
| P7.2 | Stripe / invoice hook (or manual export for India) | ⬜ blocked on a business decision: Stripe vs manual invoice export |
| P7.3 | Suspend on payment failure | ⬜ follows P7.2 (`licenceStatus = SUSPENDED` already exists to flip) |

**Scope note (P7.1).** `esti_orgsettings` is a **singleton** — one install = one
firm — and the `hlp_` licensing tables share that database, so the dashboard
reads workspace counters directly (`backend/src/licensing-platform/modules/admin/dashboard.ts`).
It therefore reports usage for **the workspace on this install**, not per-tenant
usage across every licensed org. True multi-tenant billing needs installs to
report into a platform-side usage table (no such table or reporting endpoint
exists today) — that is a prerequisite for P7.2, not a detail of it.

**Verify:** platform-admin console → Dashboard → "Metered usage — this workspace".

---

## Execution order

```
P0 (human landing) ──► P1 migration ──► P2 storage
                              │
                              ├─► P3 AI key
                              ├─► P4 remove community + ALL desktop
                              ├─► P6 SEO content
                              └─► P7 billing

P5 (Estimate desktop auth) — CANCELLED 2026-07-19, web-only
```

---

## Key files

| Area | Path |
|------|------|
| Product law | `docs/esti/PLANS-AND-TIERS.md` |
| Plans (legacy code) | `packages/contracts/src/plans.ts` |
| Landing shell | `frontend/src/components/landing/MarketingShell.tsx` |
| Landing route | `frontend/src/routes/Landing.tsx` |
| Desktop (deleting — P4.1) | `desktop/`, `.github/workflows/desktop.yml`, `deploy/fetch-installers.sh` |
| In-browser estimating (replaces the cancelled desktop app) | `backend/src/modules/estimate/`, `backend/src/modules/rateBook/`, `frontend/src/components/ProjectEstimates.tsx` |
| Firm AI settings | `backend/src/modules/firm/`, `Company.tsx` |
| UI rail/stage autopilot | [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-18 | Status audit vs code: P1/P2/P6 detail rows ticked (shipped but never checked off); P3 and P4 downgraded ✅→🔄 (BYO key unwired; desktop Manager + `ESTI_EDITION` still present); P5 marked blocked — `estimate/` app absent from repo. |
| 2026-07-18 | P4.3/P4.4 shipped: Community edition code removed (`ESTI_EDITION`, `seedCommunity.ts`, `lanInstance.ts`, portal-login refusal); backup-code recovery kept via `lib/backupCode.ts`. P4.5 confirmed (no download page). Remaining P4: Manager teardown (P4.1 + P4.6). |
| 2026-07-19 | **Product direction: web-only — no desktop apps.** P5 (Estimate desktop auth) cancelled outright; P4 widened to remove every desktop artifact (Manager/Tauri, installers, download plumbing, `env.DESKTOP`/`IS_DESKTOP`). PLANS-AND-TIERS updated: the licence table now states "Desktop: None". `FIRM_PLAN` explicitly retained — the VPS installer, not the desktop app, is its surviving consumer. ESTICAD (native CAD companion) deliberately left out of scope. |
| 2026-07-19 | P7.1 shipped: `admin.dashboard.usage` (storage used/quota incl. add-on, hosted AI tokens) + "Metered usage" panel on the platform-admin dashboard. Stale-month token counters correctly report 0, matching the AI router's lazy reset. Verified via tRPC caller against real rows (current/stale/null month) with admin, non-admin, and anonymous contexts. Documented the single-tenant scope limit that blocks P7.2. |
| 2026-07-18 | P3 complete: BYO key now sealed at rest (AES-256-GCM, `lib/secretBox.ts`, keyed from `SESSION_SECRET`); fixed boot bug where `ensureOllamaAiSettings` wiped firm cloud config + key on every backend restart; stale Enterprise-only gate removed from `ai.setSettings`. E2E verified: key sealed in DB (`enc:v1:…`), survives restart, redacted from reads. |
| 2026-07-09 | Roadmap created. Product pivot: no tiers; storage + AI pricing; Estimate-only desktop; ACTIVE licence migration. |
