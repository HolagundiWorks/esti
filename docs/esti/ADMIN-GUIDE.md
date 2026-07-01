# AORMS — Administrator Guide

One place for everything an operator needs to **deploy, build, license, and run** AORMS,
plus the **AORMS Identity** account model (I-1…I-5, shipped). This ties together the
deeper references:

- Deployment step-by-step → [`VPS-INSTALL.md`](VPS-INSTALL.md)
- Scripts quick-reference → [`../../deploy/README.md`](../../deploy/README.md)
- Identity model in full → [`AORMS-IDENTITY.md`](AORMS-IDENTITY.md)
- HTTPS + Google sign-in → [`AORMS-LITE-AND-GOOGLE-AUTH.md`](AORMS-LITE-AND-GOOGLE-AUTH.md)
- Ops runbook → [`PRODUCTION-OPS.md`](PRODUCTION-OPS.md)
- Access / roles → [`ACCESS-HIERARCHY.md`](ACCESS-HIERARCHY.md)

*Repo:* `HolagundiWorks/esti` · *Install root:* `/opt/esti` · *Last updated: 2026-07-01.*

---

## 1. The account model (AORMS Identity)

AORMS has **three distinct account types**. Identity is portable: a person's ID and their
certs/growth belong to the *person*, not the firm — change firms, keep the ID.

| Account | Who | Where they act | Unique ID |
|---|---|---|---|
| **Platform admin** | Holagundi/AORMS team | `/platform-admin` (products, plans, licences, orgs) | — (internal) |
| **Company** | a firm/tenant | owns the workspace, holds the licence | `AORMS-C-XXXX` |
| **Personal** | an individual professional | activates into a company; owns certs/growth | `AORMS-U-XXXX` |

- IDs are Crockford base32, generated once, human-quotable (`AORMS-C-2K4P`, `AORMS-U-9F3T`).
- The **personal** `AORMS-U-` id is the **portable** key — certifications, ASPRF/growth,
  and membership history are all keyed to it, so they survive moving between firms.
- Data lives in the licensing platform tables (`hlp_account`, `hlp_organization`,
  `hlp_org_member`, `hlp_certification`, `hlp_growth_event`). A firm login (`esti_user`)
  is a **projection** — linked to a person via `esti_user.account_public_id`.

---

## 2. Every URL an admin touches

All on your one domain (`https://<domain>`), TLS-terminated by nginx.

| URL | What it is | Auth |
|---|---|---|
| `/` | Firm app home (**Studio Intelligence**) — or the public Landing if `VITE_PUBLIC_SITE=true` | firm session |
| `/login` | **Firm login** — classic email + password (the firm's `esti_user`) | — |
| `/demo` | One-click auto-login into the seeded demo (profile 2 only) | baked demo creds |
| `/platform-admin` | **Platform console** — tenant-first login; Holagundi admin + company/personal self-serve | platform session |
| `/platform` | Platform backend root (not a page) | — |
| `/platform/trpc` | Platform API (tRPC) | platform session |
| `/platform/auth/*` | Platform auth: `resolve-company`, `login`, `switch-company`, `create/join/leave-company`, `my-credentials` | — |
| `/platform/v1` | **Product Licence API** — a firm node activates/refreshes its licence here | product API key |
| `/platform/auth/google/callback` | Google OAuth redirect (if Google sign-in enabled) | — |
| `/download` | Desktop installer portal (Lite/Core/Enterprise `.exe`) | public |
| `/health`, `/readyz` | Liveness / readiness (proxied to backend) | public |
| `/trpc`, `/upload`, `/storage`, `/calendar` | Firm app API + file routes (proxied) | firm session |

Internal-only (never exposed): Postgres, Redis, MinIO. Backend binds `127.0.0.1:4000` only.

---

## 3. Login flows (important distinction)

There are **two** logins, and today they behave differently:

**A. Firm app — `/login` (classic).** Email + password against the firm's local `esti_user`.
This is what a firm's staff use day-to-day. *(Delegating this to the central platform is a
planned follow-up — see AORMS-IDENTITY §10 — so for now firm credentials are local.)*

**B. Platform console — `/platform-admin` (tenant-first, two-step).**
```
Step 1  "Company email or domain"   → e.g. acme.in / contact@acme.in / AORMS-C-2K4P
          │ resolve
   ┌──────┴───────────────┐
 domain = aorms.in?     a customer company?
   │ yes                   │ yes
   ▼                       ▼
Step 2a  Platform admin   Step 2b  Your email + password
  (email+password)          → verifies ACTIVE membership of that company
  → /platform-admin           → company workspace / switcher
```
- A **solo** practitioner uses the same email in both steps — no special case.
- `aorms.in` (the platform-owner domain) routes Step 2 to the **platform-admin** login.
- Unknown company → "Company not found" + **Create a company** (sign-up).
- The platform session cookie is scoped to `(account, org)` = the active company; a
  company **switcher** appears when a person has multiple ACTIVE memberships.

---

## 4. Deploy — fresh VPS in ~5–8 min

### Provision
Ubuntu **22.04 / 24.04 LTS**, **≥ 4 GB RAM** (2 GB will OOM the Vite build — add swap on 4 GB),
2 vCPU, 25 GB+ disk. Open ports **22, 80, 443**.

### Pre-flight
1. **Point DNS first** — `A` record `your-domain` → VPS IP (certbot fails if it doesn't
   resolve). Verify `dig +short your-domain` = the VPS IP.
2. Add swap if on 4 GB:
   ```bash
   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

### Install
```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh          # pick a profile from the menu
```

### Profiles (the menu)
| # | Profile | Landing | Demo | Plan | Root when logged out |
|---|---|---|---|---|---|
| 1 | Landing page only | ✅ | — | Enterprise | Landing |
| 2 | **Production demo** | ✅ | ✅ | Enterprise | Landing + one-click `/demo` |
| 3 | **AORMS Core** | — | — | Core | `/login` |
| 4 | **AORMS Enterprise** | — | — | Enterprise | `/login` |
| 5 | **Licensing & Account** | — | — | Enterprise | `/login` + `/platform-admin` |
| 6 | Learning & Certification | — | — | — | *(pipeline — exits)* |

**Licensing is also a y/N add-on** on profiles 2/3/4 (the `/platform` backend is mounted in
every deploy). So "Landing + Demo + Licensing" = pick **2**, answer **y**.

### Prompts (in order)
Profile → *(Licensing add-on? y/N)* → Domain → TLS email → Postgres pw *(Enter = auto)* →
Session secret *(Enter = auto)* → MinIO user/pw → **Owner email + password (your admin login)** →
Demo pw *(profile 2 — keep `demo1234`)* → **Platform admin emails** *(if licensing)*.

All secrets are written to `/opt/esti/.env` (chmod 600, root-only).

### Non-interactive
```bash
PROFILE=demo WITH_LICENSING=true DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' PLATFORM_ADMIN_EMAILS=you@firm.in \
  sudo -E bash deploy/install.sh
```
`PROFILE` ∈ `landing | demo | core | enterprise | licensing | learning`.

---

## 5. Environment reference (`/opt/esti/.env`)

Written by the installer; edit + `bash deploy/update.sh` to apply. Key groups:

**Profile / build**
| Key | Meaning |
|---|---|
| `DEPLOY_PROFILE` | the chosen profile |
| `VITE_PUBLIC_SITE` | `true` = show Landing/blog when logged out |
| `SEED_DEMO` | seed the demo workspace on install |
| `FIRM_PLAN` | `LITE` \| `CORE` \| `ENTERPRISE` — the fallback tier when unlicensed |
| `VITE_{LITE,CORE,ENTERPRISE}_DOWNLOAD_URL` | `/downloads/…exe` (set by `fetch-installers.sh`) |

**Central identity + licence authority**
| Key | Default | Meaning |
|---|---|---|
| `ESTI_ROLE` | `node` | a firm install is a licence *consumer* (node), not the hub |
| `ESTI_LICENSE_API_URL` | `https://aorms.in/platform` | where the node activates/refreshes its licence (`/platform/v1`). Override **only** if you self-host the platform |
| `ESTI_PRODUCT_API_KEY` | *(empty)* | **empty = node stays unmanaged on `FIRM_PLAN`** (cannot brick a running install). Set the key from Holagundi to activate a real licence |
| `ESTI_IDENTITY_DELEGATE` | `false` | **opt-in.** `true` = firm login is verified against the central platform, then falls back to the cached local password if it's unreachable. Default off = local login only |
| `ESTI_IDENTITY_URL` | *(empty → uses `ESTI_LICENSE_API_URL`)* | base URL of the identity platform for delegated login |
| `ESTI_COMPANY` | *(empty)* | this firm's `AORMS-C-` handle — membership in it is enforced on delegated login |

**Licensing & account platform**
| Key | Meaning |
|---|---|
| `PLATFORM_ADMIN_EMAILS` | comma-separated allowlist for `/platform-admin` sign-in |
| `FRONTEND_ORIGIN` | `https://<domain>` |
| `ONBOARD_RETURN_ORIGINS` | allowed product return URLs for `/platform/onboard` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | set to enable Google sign-in (else email+password only) |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/platform/auth/google/callback` |

> The Step-1 **admin branch** resolves on the `aorms.in` domain (default in code); the admin
> *allowlist* is `PLATFORM_ADMIN_EMAILS`. Google is optional — the console works with plain
> email+password out of the box.

**Secrets** (`DATABASE_URL`/PG password, `SESSION_SECRET`, MinIO creds) — auto-generated;
never commit. The licence signing key is env-only. `.env` is chmod 600.

---

## 6. Builds

### 6a. The web SPA (built on the VPS)
The installer/`update.sh` builds the frontend with Vite (4 GB heap) inside the `frontend`
build-only container and atomic-swaps `frontend/dist`, served statically by nginx.
`VITE_*` values are **build-time** — changing them requires a rebuild (`deploy/update.sh`).

### 6b. Desktop installers (built on GitHub, hosted by the VPS)
Windows `.exe` can't be built on Linux. **GitHub Actions** (`.github/workflows/desktop.yml`,
windows-latest) builds all three editions and publishes them on a `desktop-v*` Release.

```bash
# 1. Build once (on GitHub): push a tag OR Actions → desktop-installer → Run workflow
git tag desktop-v1.0.0 && git push origin desktop-v1.0.0
# → Release desktop-v1.0.0 with AORMS-{Lite,Core,Enterprise}-Setup.exe

# 2. Host on the VPS (private repo → gh must be authed):
apt-get install -y gh && gh auth login          # or export GH_TOKEN=<token>
cd /opt/esti
bash deploy/fetch-installers.sh                  # newest desktop-v* release
bash deploy/fetch-installers.sh desktop-v1.0.0   # or pin a tag
```
`fetch-installers.sh` downloads the 3 `.exe`, writes `VITE_*_DOWNLOAD_URL` into `.env`,
**rebuilds the SPA** (so the buttons go live), and serves them under `/downloads/`.
`update.sh` preserves `dist/downloads/` — re-run `fetch-installers.sh` only for a **new**
installer version.

> Installers are **unsigned** → SmartScreen/Defender warns on first run. Code-signing is the
> open follow-up.

---

## 7. Licensing operations

**How a firm gets licensed (node → aorms.in):**
1. Firm install defaults `ESTI_LICENSE_API_URL=https://aorms.in/platform`, `ESTI_ROLE=node`.
2. With **no** `ESTI_PRODUCT_API_KEY`, the node runs **unmanaged** on its `FIRM_PLAN`
   (safe — nothing to break).
3. To license it: set `ESTI_PRODUCT_API_KEY=<key from Holagundi>` in `.env`, then
   `bash deploy/update.sh`. The node activates against `/platform/v1` and derives its plan
   + seats from the signed licence.

**Issuing licences (Holagundi platform admin):** at `/platform-admin` → **Licenses**
(also **Organizations**, **Products & plans**, **API keys**). A licensing install
auto-seeds one demo licence per tier: `demo.lite1@aorms.in` / `demo.core1` /
`demo.enterprise1`, password `demo1234`.

**First platform-admin sign-in:** open `/platform-admin` → "Need an account? Create one" →
register with an email that is in `PLATFORM_ADMIN_EMAILS` (≥8-char password). That account
is auto-granted platform admin. Change the allowlist later by editing `.env` +
`deploy/update.sh`.

---

## 8. AORMS Identity operations

**Platform console (`/platform-admin`) top of page, for the signed-in person:**
- **Active company** switcher (multiple ACTIVE memberships).
- **Your companies** — create / join / leave a company. Joining **auto-activates** if your
  email domain matches the company's login-domain, else it's INVITED pending approval.
- **My credentials** — your portable certifications + growth (keyed to `AORMS-U-`).
- **Admin sections** (platform admins only): Licenses · Organizations · Products & plans ·
  API keys. Inside **Organizations** → a **Members** manager: invite / set-status / issue a
  certification to a member.

**Company lifecycle:** sign-up creates `hlp_organization` (+ `AORMS-C-id`, login-domain),
the owner account, an OWNER membership, and a licence. Members are `hlp_org_member` with
status `INVITED → ACTIVE → LEFT`; only **ACTIVE** memberships can sign in / switch.

**Firm-side (in the firm app):** an owner links a firm user to a central person in
**Users** (`users.linkIdentity`, validates the `AORMS-U-` handle exists); the linked handle
shows in the Users table and in **Profile › AORMS Identity**. Existing firm logins are
simply *unlinked* until an owner links them — nothing breaks.

**Portability:** leave a company → membership `LEFT`, the `esti_user` deactivates, but certs
+ growth stay on the person. Re-activate elsewhere → the **same** `AORMS-U-id` joins the new
company; the growth timeline shows both firms.

### Delegated login — "all users online" (opt-in, default off)

By default each firm install verifies logins against its **local** `esti_user` table. Turn on
delegation and the firm app instead verifies credentials against the central platform, then
projects the person onto a local user — so one identity works across web + desktop, with an
**offline grace** fallback to the last cached password when the platform is unreachable.

**Enable (pilot one install first):**
1. `https://aorms.in/platform-admin` → **API keys** → mint a product key for AORMS.
2. On the firm install's `/opt/esti/.env`:
   ```
   ESTI_IDENTITY_DELEGATE=true
   ESTI_PRODUCT_API_KEY=<the key>
   ESTI_COMPANY=AORMS-C-XXXX        # this firm's company handle
   # ESTI_IDENTITY_URL defaults to https://aorms.in/platform
   ```
3. `bash deploy/update.sh`, then sign in as a person who is an **ACTIVE member** of that company.

**Behaviour:** valid central credentials + membership → in (a new person is projected as
**ASSOCIATE**, never auto-OWNER); invalid → rejected; platform unreachable → falls back to the
cached local password so the app still opens offline. Flip it off (`false` + update) to revert
to local login at any time — no data changes.

---

## 9. Day-2 operations

```bash
# Update to latest code (profile remembered in .env)
cd /opt/esti && bash deploy/update.sh
GIT_BRANCH=feat/x bash deploy/update.sh      # a specific branch
REFRESH_NGINX=true bash deploy/update.sh     # also re-apply the nginx vhost

# Backups / restore (add backup.sh to root crontab for daily dumps)
bash deploy/backup.sh /opt/esti/backups
bash deploy/restore.sh /opt/esti/backups/esti-pg-YYYYMMDD-HHMMSS.sql.gz

# Service control
docker compose -f /opt/esti/compose.prod.yaml ps
docker compose -f /opt/esti/compose.prod.yaml logs -f backend
systemctl restart esti

# Switch profile without reinstalling (e.g. demo → firm-core)
sed -i 's/^VITE_PUBLIC_SITE=.*/VITE_PUBLIC_SITE=false/;s/^SEED_DEMO=.*/SEED_DEMO=false/;s/^FIRM_PLAN=.*/FIRM_PLAN=CORE/' .env
bash deploy/update.sh
```

**Migrations** apply automatically on backend boot (`runMigrations()`); the identity set
(0132–0136) is journaled and included. No manual step on deploy.

---

## 10. Verify & troubleshoot

```bash
docker compose -f /opt/esti/compose.prod.yaml ps               # all Up / healthy
bash /opt/esti/scripts/smoke-health.sh http://127.0.0.1:4000
curl -sI https://<domain> | grep -i strict-transport           # HSTS = TLS live
```
Then open `https://<domain>`, log in as the owner. Profile 2 → `/demo`. Licensing →
`/platform-admin`.

| Symptom | Fix |
|---|---|
| Certbot fails at TLS | DNS not pointing here yet → fix `A` record, re-run installer |
| Frontend build OOM-killed | < 4 GB RAM, no swap → add swap (§4), re-run |
| `esti-db is unhealthy` | stale volume → `docker compose -f compose.prod.yaml down -v`, re-run installer |
| Demo login 401 | `SEED_DEMO_PASSWORD` ≠ `demo1234` → reset, re-run `seedDemo.js` |
| Landing only shows when logged in | `VITE_PUBLIC_SITE=false` → set `true`, `update.sh` |
| `/download` buttons say "Coming soon" | installers not fetched → `deploy/fetch-installers.sh` |
| Node won't license | `ESTI_PRODUCT_API_KEY` empty/invalid, or `aorms.in` unreachable → set key, check egress |

---

## 11. Security posture (already hardened)

- Backend bound to `127.0.0.1`; DB/Redis/MinIO have **no** host ports.
- Session cookies `httpOnly` + `sameSite=strict` + `secure`; platform session scoped to
  `(account, org)`.
- Rate-limit 600/min, 50 MB upload cap, nginx security headers + HSTS + `server_tokens off`,
  HTTP→HTTPS forced.
- Secrets in `.env` (chmod 600); `*.pem`/`*.key`/`.keys/` git-ignored; licence signing key
  env-only. Passwords are hashed — never stored in plaintext, never set by an operator on
  someone's behalf (allowlist by email instead).

See [`PRODUCTION-OPS.md`](PRODUCTION-OPS.md) for the full runbook.
