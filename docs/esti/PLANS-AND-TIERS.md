# AORMS — pricing, licensing & usage (2026-07 pivot)

> **⚠ Major revision (2026-07-09).** There are **no product editions** — no Lite,
> Pro, Core, Community, or Enterprise. One **AORMS** workspace; you pay for
> **storage** and **AI model usage**. Implementation queue:
> [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md).

## One product

| Surface | Where it runs | Auth |
|---------|---------------|------|
| **AORMS** (workspace) | Cloud web app | Firm login · active licence |
| **AORMS Estimate** | **Desktop only** (Windows) | Firm login before launch · linked to **project** Cost Management |

There is **no** AORMS Community desktop app, **no** full-product desktop installer,
and **no** tier-gated feature matrix. Capability gates remain **role-based**
(`can(role, capability)` in `packages/contracts`) — not edition-based.

## Pricing model

You pay for what you consume:

| Meter | Included on signup | Overage |
|-------|-------------------|---------|
| **Storage** | **5 GB** cloud object storage (drawings, documents, PDFs) | Billed per GB-month |
| **AI model** | Hosted ESTI / Ask ESTI usage on AORMS default model | Billed per token or bring your own API key (no hosted meter) |

**Not metered — unlimited on every active licence:**

- Users (staff logins)
- Clients
- Contractors
- Consultants
- Active projects

## Default new account

1. Self-serve signup → firm workspace created.
2. Licence status **`ACTIVE`** with **5 GB** storage quota (`orgSettings` / licence record).
3. Full workspace feature set (GST, HR, portals, cognition, etc.) — no edition strip.
4. AI Studio uses the platform default model until the firm adds a **BYO API key**
   (OpenAI-compatible base URL + model + key) under Company → AI.

## Bring-your-own AI API key

Firms may plug in their own inference endpoint for better performance, lower
latency, or private models:

- **Settings:** Company → AI → API key (write-only storage).
- **Behaviour:** Ask ESTI, AI Studio, and agent routes prefer the firm key when
  set; fall back to the hosted model if unreachable.
- **Billing:** No hosted AI meter while BYO is active for that firm (autopilot
  implements the toggle).

See autopilot phase **P3** for schema, UI, and tRPC.

## AORMS Estimate (desktop)

- **Only** the Estimate app ships as a native desktop build.
- **Requires authentication** before the estimator runs (session from AORMS login
  or device pairing — same identity as the cloud workspace).
- **Project link:** export `.aormsest` → import under **Project › Cost
  Management**; desktop round-trip stays tied to a project record.
- No offline Community workspace; no local-first full AORMS.

## Licence states

| Status | Meaning |
|--------|---------|
| **`ACTIVE`** | Full workspace; storage + AI meters apply |
| `SUSPENDED` | Read-only / blocked (billing or admin) |
| `EXPIRED` | Legacy token past validity — migrate to ACTIVE |

### Migration — existing users

All firms on legacy **`LITE`**, **`PRO`**, **`ENTERPRISE`**, or **`CORE`**
plans are **moved to `ACTIVE`** with the new storage default (5 GB included).
No feature downgrade at migration; tier enums become **historical** in the DB
until a schema migration renames them (autopilot **P1**).

Legacy licence tokens from the platform console map to **`ACTIVE`** + usage
meters, not to a tier name.

## Enforcement (target implementation)

1. **`licenceStatus`** (or `plan` renamed) → `ACTIVE | SUSPENDED | …` — not LITE/PRO.
2. **Storage** — `withinStorage(usedBytes, quotaBytes)`; default quota = 5 GB;
   purchased add-ons lift `storagePurchasedBytes`.
3. **AI** — meter hosted calls OR skip meter when `aiByoApiKey` is set.
4. **Remove** `planAllows(plan, feature)` edition gates; keep role capabilities.
5. **Remove** seat / client / contractor / project count quotas.
6. **Frontend** — drop edition chips; show storage usage + AI settings in Company.

Until autopilot lands, legacy `Plan` enums may still exist in code — treat this
document as the **target** product law.

## What was retired

| Retired | Replacement |
|---------|-------------|
| AORMS Community (free tier + desktop) | Web signup with 5 GB included |
| AORMS-Pro / Enterprise editions | Usage billing on ACTIVE licence |
| Lite / Core / Enterprise enums (user-facing) | ACTIVE + meters |
| Full-product desktop (Lite/Core/Enterprise installers) | Web only; Estimate desktop only |
| Community self-host appliance | Cloud workspace (self-host remains an ops deploy profile, not an edition) |

Historical module matrices in git history pre-2026-07-09 are **invalid**.

## Related docs

- [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) — implementation queue
- [MONOREPO-AND-SURFACES.md](MONOREPO-AND-SURFACES.md) — deployable surfaces
- [ESTIMATION-ARCHITECTURE.md](ESTIMATION-ARCHITECTURE.md) — Estimate ↔ project loop
- [COMMUNITY-EDITION.md](COMMUNITY-EDITION.md) — **retired** (pointer only)
