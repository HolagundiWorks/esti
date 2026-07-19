# AORMS — licensing & usage (2026-07)

> **Product law:** One **standard AORMS licence**. No trials, no tiers, no Community
> edition, no Lite/Pro/Enterprise split. You sign up, get an **ACTIVE** licence with
> the full workspace and **5 GB** storage included. You pay for **extra storage** and
> **hosted AI usage** (or bring your own API key).
>
> Implementation queue: [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md).

## One standard licence

| What you get | Detail |
|--------------|--------|
| **Licence** | `ACTIVE` — full **AORMS-Studio** workspace |
| **Users** | Unlimited staff logins |
| **Clients / contractors / consultants / projects** | Unlimited |
| **Storage** | **5 GB** included; overage billed per GB-month |
| **AI** | Hosted ESTI metered, or BYO OpenAI-compatible API key |
| **Desktop** | **None** — AORMS is web-only (2026-07-19) |

AORMS ships **no desktop application of any kind**: no free tier, no trial
workspace, no Community desktop, no full-product offline installer, and no
standalone Estimate app. Estimating, BOQs, and rate books run **in the browser**
as part of the workspace. Capability gates are **role-based**
(`can(role, capability)` in `packages/contracts`) — not edition-based.

## Surfaces

| Surface | Where | Auth |
|---------|-------|------|
| **AORMS** (workspace) | Cloud web app | Firm login · ACTIVE licence |

## Signup flow

1. Self-serve signup at `/account?mode=create` → firm workspace created.
2. Licence status **`ACTIVE`** with **5 GB** storage quota.
3. Full feature set immediately — GST, HR, portals, cognition, AI Studio, etc.
4. Company → AI for optional BYO API key.

## Usage billing

| Meter | Included | Overage |
|-------|----------|---------|
| **Storage** | 5 GB | Per GB-month |
| **AI (hosted)** | Platform default model | Per token, or BYO key (no hosted meter) |

## Licence states

| Status | Meaning |
|--------|---------|
| **`ACTIVE`** | Full workspace; storage + AI meters apply |
| `SUSPENDED` | Blocked (billing or admin action) |
| `EXPIRED` / `GRACE` | Legacy token lifecycle — renew to ACTIVE |

### Legacy migration

Firms on historical **`LITE`**, **`PRO`**, **`ENTERPRISE`**, or **`CORE`** DB values
were migrated to **`ACTIVE`** with the same feature access and 5 GB default storage.
Tier enums in code are **deprecated shims** only.

## Enforcement

1. **`licenceStatus`** → `ACTIVE | SUSPENDED` (not LITE/PRO).
2. **Storage** — `withinStorage(usedBytes, quotaBytes)`; default 5 GB + purchased add-ons.
3. **AI** — meter hosted calls unless firm BYO key is set.
4. **Roles** — `permissions.ts` / `can()` for feature access.
5. **UI** — show "AORMS Standard" + storage/AI meters; no edition chips or upgrade funnels.

## Retired (do not reference)

| Retired | Replacement |
|---------|-------------|
| AORMS Community | Web signup, standard licence |
| Lite / Pro / Enterprise / Core editions | ACTIVE + usage meters |
| Trial workspace requests | Self-serve signup or demo |
| Full-product desktop installers | Web workspace |
| AORMS Estimate desktop app | In-browser estimating (rate books + BOQ estimates) |
| Desktop Manager / Tauri shell | Web workspace |
| Community self-host appliance | Cloud workspace (self-host = ops profile only) |
| Seat / client / project count caps | Unlimited on ACTIVE |

## Related docs

- [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md)
- Community edition — **retired** (2026-07-09); one **AORMS Standard** licence only
- [MONOREPO-AND-SURFACES.md](MONOREPO-AND-SURFACES.md)
- [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md) — active cost rebuild (supersedes retired Estimation OS / standalone Estimate app)
