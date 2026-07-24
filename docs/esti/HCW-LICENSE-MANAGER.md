# HCW License Manager (in-tree)

**Status:** internalised in the `esti` monorepo (merged 2026-06-28 from the former
sibling repo `holagundi-license-panel`). There is **no** separate license-manager
package or git dependency — do not reintroduce one.

Executable labels: `HCW_LICENSE_MANAGER` in
`frontend/src/lib/product-nomenclature.ts`.

## What it is

The **HCW License Manager** is AORMS's central licensing authority:

- Portable accounts & organisations (`hlp_account`, `hlp_organization`, …)
- Products, plans, licences, seats, devices, API keys
- Product License API for firm nodes (`/platform/v1/*`)
- Operator **Licensing console** UI (`admin.aorms.in` or `/platform-admin`)

Operator / design studio: **Human Centric Works (HCW)**. Product brand on the
console is **Licensing console** / AORMS account hub — not a third-party SaaS name.

## Where the code lives

| Layer | Path |
| --- | --- |
| Contracts | `packages/contracts/src/licensing-platform.ts` |
| Schema (`hlp_*`) | `backend/src/db/schema/licensing-platform.ts` |
| Backend mount | `backend/src/licensing-platform/` → Fastify prefix `/platform` |
| Product API | `…/routes/v1.ts` — activate / refresh / entitlement / report-usage |
| Admin tRPC | `…/trpc/` → `/platform/trpc` |
| Console UI | `frontend/src/platform-admin/` (+ Vite entry `admin.html`) |
| Node consumer | `backend/src/modules/license/` + `backend/src/lib/panelLicense.ts` |

Wired at boot by `registerLicensingPlatform()` in `backend/src/index.ts`.

## Hub vs firm node

Same codebase, different role:

| Role | Behaviour |
| --- | --- |
| **Hub** (e.g. `aorms.in`) | Owns populated `hlp_*` data; issues keys; hosts the console |
| **Firm node** | Calls hub `ESTI_LICENSE_API_URL` + `ESTI_PRODUCT_API_KEY`; verifies panel tokens offline via the embedded Ed25519 public key |

Local `hlp_*` tables exist on every install (schema migrations are unconditional);
that is intentional. Only the hub's copy is the authority.

## Console deployment

Default path is **this repo**:

1. Frontend build emits `dist/admin.html`.
2. `deploy/install-admin-console.sh` serves it on `admin.DOMAIN` and proxies
   `/platform/` to the local backend.
3. Or keep the embedded console at `/platform-admin` (`VITE_ADMIN_URL=""`).

A third-party static client may still speak the
[ADMIN-CONSOLE-API.md](ADMIN-CONSOLE-API.md) contract — that is an optional
integration, not a second source of truth.

## Naming

| Prefer | Avoid |
| --- | --- |
| HCW License Manager / Licensing console | Holagundi License Panel / License Cloud |
| In-tree / monorepo | “separate repo `holagundi-license-panel`” |
| `hlp_*` (codename, keep) | Renaming tables to `aorms_*` |

## Related docs

- [ADMIN-GUIDE.md](ADMIN-GUIDE.md) — operators
- [ADMIN-CONSOLE-API.md](ADMIN-CONSOLE-API.md) — `/platform` contract
- [AORMS-IDENTITY.md](AORMS-IDENTITY.md) — portable IDs + hub verify
- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) — surface labels
