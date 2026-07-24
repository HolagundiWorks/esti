# AORMS surface URLs (frozen)

**Status:** Canonical · **Frozen:** 2026-07-11 · **Revised:** 2026-07-22 · **Owner:** HCW

Executable constants: `frontend/src/lib/aorms-surface-urls.ts` and
`frontend/src/lib/product-nomenclature.ts`.

Only **three subdomains** remain. Everything else is a **path on aorms.in**.

---

## Subdomains (hosts)

| Host | Surface | Audience | Role |
| --- | --- | --- | --- |
| **[aorms.in](https://aorms.in)** | Platform | Public + authenticated pages | Marketing, wiki, blog, auth, account, external portals |
| **[studio.aorms.in](https://studio.aorms.in)** | **AORMS-Studio** | Firm staff | Architecture consultancy workspace |
| **[consultancy.aorms.in](https://consultancy.aorms.in)** | **AORMS-Consultancy** | Public / prospects + firm staff (post-launch) | Engineering consultancy marketing + product entry (launch gated on P9.V / P9.M) |
| **[admin.aorms.in](https://admin.aorms.in)** | Licensing console | HCW operators | Platform administration |

---

## Platform pages (aorms.in paths)

Same SPA bundle; no dedicated host.

| Path | Surface | Notes |
| --- | --- | --- |
| `/` | Platform landing | Hero, frameworks, conversion dock |
| `/login` | AORMS-Studio sign-in | Architecture marketing + workspace login |
| `/wiki`, `/wiki/*` | AORMS Wiki | Public documentation |
| `/blog`, `/blog/*` | Blog | Editorial |
| `/access` | External portals | Client, consultant, contractor, site sign-in |
| `/account` | Personal account | Identity + licence hub |
| `/company-account` | Company account | Firm owners |
| `/libraries/knowledge-bank-portal` | Knowledge Bank portal | Staff L4+, EOMS intake |
| `/aorms-consultancy` | Consultancy marketing | Path alias; canonical host `consultancy.aorms.in` |
| `/about`, `/legal`, `/investors`, SEO landings | Marketing | Public pages |

---

## Legacy subdomain redirects

Retired hosts **301 → aorms.in** (nginx + client-side fallback in `App.tsx`):

| Legacy host | Redirect |
| --- | --- |
| `wiki.aorms.in` | `https://aorms.in/wiki` (+ path preserved) |
| `kbank.aorms.in` | `https://aorms.in/libraries/knowledge-bank-portal` |
| `external.aorms.in` | `https://aorms.in/access` |
| `account.aorms.in` | `https://aorms.in/account` |
| `app.aorms.in` | **301 → `https://studio.aorms.in`** |
| `www.aorms.in` | **301 → `https://aorms.in`** |

---

## Deploy checklist

1. **DNS** — A records for `aorms.in`, `studio`, `consultancy`, `admin`.
2. **TLS** — certbot SAN cert (see `deploy/nginx-proxy.conf`).
3. **ALLOWED_ORIGINS** — `https://aorms.in`, `https://studio.aorms.in`, `https://consultancy.aorms.in`, `https://admin.aorms.in` (`AORMS_ALLOWED_ORIGINS` in code).
4. **VITE_ADMIN_URL** — `https://admin.aorms.in` for production frontend builds.
5. **Single SPA dist** — apex + studio + consultancy serve the same `frontend/dist`; routing is host-aware in `App.tsx`. Admin console is a separate deployment.

Local dev: use path aliases on `localhost:5173`; optional `/etc/hosts` for subdomain testing.

---

## Related

- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)
- [KNOWLEDGE-BANK-PORTAL.md](KNOWLEDGE-BANK-PORTAL.md)
