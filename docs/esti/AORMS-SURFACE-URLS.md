# AORMS surface URLs (frozen)

**Status:** Canonical · **Frozen:** 2026-07-11 · **Owner:** HCW

Executable constants: `frontend/src/lib/aorms-surface-urls.ts` and
`frontend/src/lib/product-nomenclature.ts`.

These hostnames are **frozen** — do not rename without a migration plan (nginx,
cookies, ALLOWED_ORIGINS, SEO, printed material).

---

## Host map

| Host | Surface | Audience | Role |
| --- | --- | --- | --- |
| **[aorms.in](https://aorms.in)** | Platform | Public | Marketing, blog, platform landing, `/wiki` path alias |
| **[studio.aorms.in](https://studio.aorms.in)** | **AORMS-Studio** | Firm staff | Architecture consultancy workspace (canonical staff app) |
| **[consultancy.aorms.in](https://consultancy.aorms.in)** | **AORMS-Consultancy** | Public / prospects | Engineering app marketing (roadmap) |
| **[wiki.aorms.in](https://wiki.aorms.in)** | Wiki | Public | Official documentation (pages at `/` on this host) |
| **[kbank.aorms.in](https://kbank.aorms.in)** | Knowledge Bank portal | Firm staff (L4+) | EmOI textbook library intake |
| **[external.aorms.in](https://external.aorms.in)** | External portals | Clients, consultants, contractors, site | Client / consultant / contractor / site portal sign-in |
| **[account.aorms.in](https://account.aorms.in)** | AORMS account | Users & firm owners | Identity, companies, licence hub |
| **[admin.aorms.in](https://admin.aorms.in)** | Licensing console | HCW operators | Platform administration |

---

## Legacy redirects (nginx)

| Legacy host | Redirect |
| --- | --- |
| `app.aorms.in` | **301 → `https://studio.aorms.in`** |
| `www.aorms.in` | **301 → `https://aorms.in`** |

Path aliases on **aorms.in** (same SPA bundle):

| Path | Equivalent surface |
| --- | --- |
| `/login` | Studio sign-in |
| `/access` | External portal sign-in |
| `/account` | Account hub |
| `/wiki/*` | Wiki (canonical host: `wiki.aorms.in`) |
| `/libraries/knowledge-bank-portal` | Knowledge Bank portal (canonical host: `kbank.aorms.in`) |
| `/aorms-consultancy` | Consultancy marketing (canonical host: `consultancy.aorms.in`) |

---

## Deploy checklist

1. **DNS** — A records for all subdomains → VPS.
2. **TLS** — certbot SAN cert or per-host certs (see `deploy/nginx-proxy.conf`).
3. **ALLOWED_ORIGINS** — comma-separated list of every `https://` host above
   (`AORMS_ALLOWED_ORIGINS` in code).
4. **VITE_ADMIN_URL** — `https://admin.aorms.in` for production frontend builds.
5. **Single SPA dist** — all hosts serve the same `frontend/dist`; routing is
   host-aware in `App.tsx`.

Local dev: add to `/etc/hosts` (optional) and extend `ALLOWED_ORIGINS` in
`compose.yaml` if testing subdomains on localhost — otherwise use path aliases
on `localhost:5173`.

---

## Related

- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)
- [MONOREPO-AND-SURFACES.md](MONOREPO-AND-SURFACES.md)
- [KNOWLEDGE-BANK-PORTAL.md](KNOWLEDGE-BANK-PORTAL.md)
