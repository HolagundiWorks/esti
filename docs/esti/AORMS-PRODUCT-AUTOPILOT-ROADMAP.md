# AORMS — Product pivot autopilot roadmap

> **Agent queue** for the **2026-07 pricing & surface pivot**: one product, usage
> billing (storage + AI model), Estimate-only desktop, BYO AI API key, legacy
> licence migration. Canonical product law:
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
3. Estimate desktop auth + project link must not duplicate qty math — `@esti/contracts` only.
4. Update this file when a phase ships.

---

## Status at a glance

| Phase | Focus | Pri | Status | Owner |
|-------|--------|-----|--------|-------|
| [P0](#p0--landing--documentation-human) | Landing + docs (product law) | P0 | ✅ | human |
| [P1](#p1--licence--migration-active) | ACTIVE licence · retire tier enums | P0 | ✅ | autopilot |
| [P2](#p2--storage-metering-5gb-default) | Storage metering · 5 GB default | P0 | ✅ | autopilot |
| [P3](#p3--ai-meter--byo-api-key) | AI usage meter · BYO API key | P1 | ✅ | autopilot |
| [P4](#p4--remove-community--full-desktop) | Remove Community + full desktop app | P1 | ✅ | autopilot |
| [P5](#p5--estimate-desktop-auth--project-link) | Estimate desktop auth · project link | P1 | ⬜ | autopilot |
| [P6](#p6--seo-landing-content-refresh) | SEO markdown landing pages | P2 | ✅ | autopilot |
| [P7](#p7--billing-console--platform-admin) | Platform admin · usage invoices | P2 | ⬜ | autopilot |

---

## P0 — Landing & documentation (human)

**Goal:** Public surfaces tell the new story before code catches up.

| # | Task | Status | Notes |
|---|------|--------|-------|
| P0.1 | Rewrite [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | ✅ | Single product · storage + AI |
| P0.2 | This roadmap | ✅ | |
| P0.3 | Retire Community edition docs | ✅ | Archived to `docs/archive/esti/COMMUNITY-EDITION.md` |
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
| P1.1 | Migration SQL: `UPDATE … SET plan = 'ACTIVE'` (or new `licence_status`) for all firms | ⬜ |
| P1.2 | `packages/contracts` — `LicenceStatus = ACTIVE \| SUSPENDED`; deprecate `Plan` enum | ⬜ |
| P1.3 | `asPlan()` shim → always `ACTIVE` during transition | ⬜ |
| P1.4 | Platform licence API — issue ACTIVE tokens only | ⬜ |
| P1.5 | `auth.me` — expose `licenceStatus`, `storageQuotaBytes`, `storageUsedBytes` | ⬜ |
| P1.6 | Remove upgrade prompts referencing Community → Pro | ✅ |

**Verify:** Existing demo + prod firms login with full features; no tier chip in UI.

---

## P2 — Storage metering (5 GB default)

| # | Task | Status |
|---|------|--------|
| P2.1 | Default `storageQuotaBytes = 5 GiB` on firm create | ⬜ |
| P2.2 | Enforce `withinStorage` on upload routes | ⬜ |
| P2.3 | Company → Storage usage bar + buy add-on hook | ⬜ |
| P2.4 | Remove `planAllows` storage tier differences | ⬜ |
| P2.5 | Archive closed project → reclaim space (existing flow) | ⬜ |

**Verify:** New signup shows 5 GB; upload blocks at quota with clear error.

---

## P3 — AI meter · BYO API key

| # | Task | Status |
|---|------|--------|
| P3.1 | `esti_firm.ai_api_key_encrypted` + `ai_provider_base_url` + `ai_model` | ⬜ |
| P3.2 | Company → AI — API key form (write-only) | ⬜ |
| P3.3 | Backend routes prefer firm key; fallback hosted Ollama | ⬜ |
| P3.4 | Usage counter `ai_tokens_month` (hosted only) | ⬜ |
| P3.5 | Settings doc + in-app hint for OpenAI-compatible endpoints | ⬜ |

**Verify:** Firm key set → calls hit external API; meter increments only when hosted.

---

## P4 — Remove Community + full desktop

| # | Task | Status |
|---|------|--------|
| P4.1 | Remove `desktop/` Lite/Core/Enterprise packaging from release workflow | ⬜ |
| P4.2 | Drop `marketing.desktopInstallers` API | ✅ | Endpoint removed; `/download` redirects to wiki |
| P4.3 | Remove `ESTI_EDITION=COMMUNITY` first-run seed path (or repurpose) | ⬜ |
| P4.4 | Delete/disable `seedCommunity.ts` appliance docs | ⬜ |
| P4.5 | Download page — Estimate only | ⬜ |
| P4.6 | `IS_DESKTOP` full-app paths → redirect to web or Estimate | ⬜ |

**Verify:** No Community installer linked from product; `desktop.yml` builds Estimate only.

---

## P5 — Estimate desktop auth · project link

| # | Task | Status |
|---|------|--------|
| P5.1 | Estimate app — login gate before estimator UI | ⬜ |
| P5.2 | Session: OAuth/device code or token from AORMS login | ⬜ |
| P5.3 | Project picker — open estimate scoped to `projectId` | ⬜ |
| P5.4 | Export `.aormsest` carries `projectId` + firm id | ⬜ |
| P5.5 | Import in Cost Management validates same firm/project | ⬜ |

**Verify:** Cold launch Estimate → login → pick project → export → import in AORMS project.

Cross-ref: [ESTIMATE-AUTOPILOT-ROADMAP.md](ESTIMATE-AUTOPILOT-ROADMAP.md) E5.

---

## P6 — SEO landing content refresh

| # | Task | Status |
|---|------|--------|
| P6.1 | Grep `content/landing/*.md` for Community/Pro/desktop | ⬜ |
| P6.2 | Batch replace with storage + web + Estimate desktop narrative | ⬜ |
| P6.3 | Sitemap/meta — remove edition keywords | ⬜ |

**Verify:** No "AORMS Community" in top 10 SEO pages.

---

## P7 — Billing console · platform admin

| # | Task | Status |
|---|------|--------|
| P7.1 | Usage dashboard — storage GB-month, AI tokens | ⬜ |
| P7.2 | Stripe / invoice hook (or manual export for India) | ⬜ |
| P7.3 | Suspend on payment failure | ⬜ |

---

## Execution order

```
P0 (human landing) ──► P1 migration ──► P2 storage
                              │
                              ├─► P3 AI key
                              ├─► P4 remove desktop/community
                              └─► P5 Estimate auth
                                        │
                                        ├─► P6 SEO content
                                        └─► P7 billing
```

---

## Key files

| Area | Path |
|------|------|
| Product law | `docs/esti/PLANS-AND-TIERS.md` |
| Plans (legacy code) | `packages/contracts/src/plans.ts` |
| Landing shell | `frontend/src/components/landing/MarketingShell.tsx` |
| Landing route | `frontend/src/routes/Landing.tsx` |
| Desktop (retire) | `desktop/`, `.github/workflows/desktop.yml` |
| Estimate app | `estimate/` |
| Firm AI settings | `backend/src/modules/firm/`, `Company.tsx` |
| UI rail/stage autopilot | [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Roadmap created. Product pivot: no tiers; storage + AI pricing; Estimate-only desktop; ACTIVE licence migration. |
