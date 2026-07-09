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
| **Licence** | `ACTIVE` — full AORMS workspace |
| **Users** | Unlimited staff logins |
| **Clients / contractors / consultants / projects** | Unlimited |
| **Storage** | **5 GB** included; overage billed per GB-month |
| **AI** | Hosted ESTI metered, or BYO OpenAI-compatible API key |
| **Desktop** | **AORMS Estimate** only (Windows) — sign in, link exports to projects |

There is **no** free tier, **no** trial workspace, **no** Community desktop, and
**no** full-product offline installer. Capability gates are **role-based**
(`can(role, capability)` in `packages/contracts`) — not edition-based.

## Surfaces

| Surface | Where | Auth |
|---------|-------|------|
| **AORMS** (workspace) | Cloud web app | Firm login · ACTIVE licence |
| **AORMS Estimate** | Desktop (Windows) | Firm login before estimating |

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
| Full-product desktop installers | Web workspace + Estimate desktop |
| Community self-host appliance | Cloud workspace (self-host = ops profile only) |
| Seat / client / project count caps | Unlimited on ACTIVE |

## Related docs

- [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md)
- [COMMUNITY-EDITION.md](COMMUNITY-EDITION.md) — retired pointer
- [MONOREPO-AND-SURFACES.md](MONOREPO-AND-SURFACES.md)
- [ESTIMATION-ARCHITECTURE.md](ESTIMATION-ARCHITECTURE.md)
