# AORMS — Administrator Guide

One place for everything an operator needs to **deploy, build, license, and run** AORMS,
plus the **AORMS Identity** account model (I-1…I-5, shipped). This ties together the
deeper references:

- Deployment step-by-step → [`VPS-INSTALL.md`](VPS-INSTALL.md)
- Scripts quick-reference → [`../../deploy/README.md`](../../deploy/README.md)
- Identity model in full → [`AORMS-IDENTITY.md`](AORMS-IDENTITY.md)
- HTTPS + Google sign-in → Google OAuth env vars in §5
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
| `/` | **AORMS-Studio** home (**Studio Intelligence**) — or the public Landing if `VITE_PUBLIC_SITE=true` | firm session |
| `/login` | **AORMS-Studio** sign-in — staff workspace; create account on public-site builds; one **standard AORMS licence** | firm session |
| `/access` | **External portals** — client, consultant, contractor, and site portal sign-in | portal session |
| `/account`, `/company-account` | **AORMS account** (personal) and **Company account** (firm owners) | platform session |
| `/wiki` | Official documentation (canonical) | public |
| `/demo` | One-click auto-login into the seeded demo (profile 2 only) | baked demo creds |
| `/platform-admin` | **Licensing console** — Holagundi platform admins **only**; simple email + password, no company step | platform session (admin) |
| `/platform` | Platform backend root (not a page) | — |
| `/platform/trpc` | Platform API (tRPC) | platform session |
| `/platform/auth/*` | Platform auth: `resolve-company`, `login`, `switch-company`, `create/join/leave-company`, `request-plan`, `my-request`, `my-credentials` | — |
| `/platform/v1` | **Product Licence API** — a firm node activates/refreshes its licence here | product API key |
| `/platform/auth/google/callback` | Google OAuth redirect (if Google sign-in enabled) | — |
| `/download` | **Retired** — redirects to `/wiki/getting-started` | public |
| `/health`, `/readyz` | Liveness / readiness (proxied to backend) | public |
| `/trpc`, `/upload`, `/storage`, `/calendar` | Firm app API + file routes (proxied) | firm session |

Internal-only (never exposed): Postgres, Redis, MinIO. Backend binds `127.0.0.1:4000` only.

---

## 3. Login flows (two distinct surfaces)

**A. Firm app / customer account — `/login` (merged).** The **only** form shown by default
is plain email + password against the firm's local `esti_user` — what a firm's staff use
day-to-day, and what a visitor lands on regardless of whether this is a public-site or
self-hosted build. **Optional delegation is now shipped** (opt-in,
`ESTI_IDENTITY_DELEGATE=true`): the firm app verifies credentials against the central
platform, with **offline-grace** fallback to the cached local password when it's
unreachable — see §5 "Delegated login". Default off = local login only.

On public-site builds, `/login` also hosts a **"Create account"** button — an explicit,
separate action (a toggle on the same page, or land directly on it via
`/login?mode=create`) for someone with no account yet: it creates a central platform
account (`hlp_account`) and raises a **plan request** (§8). This is a one-way door into
sign-up only — it does not become the default view, and it is not where an existing
account is managed. There is no separate `/account` URL.

Managing an already-created account (plan/request status, companies, 2FA, credentials) is
a **workspace** feature, not a `/login` one: once signed in to the firm workspace, it's the
**Account** tab under Profile (`/profile`) — sign in there once (a separate `hlp_session`
cookie from the workspace's own session) to link it for that browser, same as any other tab.

**B. Licensing console — `/platform-admin` (admin only, single step).** Plain email +
password, no company step, no "Create account" flow for customers. "Create account" only
appears **before the first admin exists** (one-time bootstrap — closes itself afterward);
after that, this URL is sign-in only. A non-admin account that signs in here is redirected
to `/login`. This is where Holagundi issues/edits licences, approves plan requests, and
manually resets a customer's password.

The tenant-first, company-scoped login (name/email/AORMS-C ID → verifies ACTIVE membership)
still exists as an internal building block (`resolveCompany`/`/platform/auth/login`'s
optional `company` param) — the merged `/login` "Create account" flow uses it with a "no
company yet? sign in with just your email" skip, since most customers are solo/personal
accounts with no company to name.

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
| `FIRM_PLAN` | **Deprecated shim** — legacy `LITE`/`CORE`/`ENTERPRISE` env values; runtime uses standard licence + `LicenceStatus` |

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

### 6b. Desktop apps (removed)

AORMS is **web-only**. The Lite/Pro/Manager desktop installers and the
`/download` portal were retired 2026-07, and the packaging itself
(`desktop/`, `.github/workflows/desktop.yml`, `deploy/fetch-installers.sh`) was
deleted 2026-07-19. `/download` permanently redirects to the landing page.

The planned standalone **AORMS Estimate** desktop app is **cancelled** —
estimating runs in the browser inside the project **Estimation** tab, priced by
firm Rate Books. See [NAVIGATION.md](NAVIGATION.md) § Estimation.

Operators on pre-2026-07 VPS layouts: `deploy/cleanup-vps.sh` removes leftover
installer files and `VITE_*_DOWNLOAD_URL` entries from a live host.

---

## 7. Licensing operations

**How a firm gets licensed (node → aorms.in):**
1. Firm install defaults `ESTI_LICENSE_API_URL=https://aorms.in/platform`, `ESTI_ROLE=node`.
2. With **no** `ESTI_PRODUCT_API_KEY`, the node runs **unmanaged** on its `FIRM_PLAN`
   (safe — nothing to break).
3. To license it: set `ESTI_PRODUCT_API_KEY=<key from Holagundi>` in `.env`, then
   `bash deploy/update.sh`. The node activates against `/platform/v1` and derives its plan
   + seats from the signed licence.

**How a customer gets licensed (self-serve → admin fulfils):**
1. Customer opens `/login` → **Create account** → creates a platform account and requests
   a workspace licence (the merged account portal — see §3).
2. Holagundi admin sees it in `/platform-admin` → **Requests** (tab badge shows the pending
   count) → **Approve & email**. This creates a perpetual `ACTIVE` licence on the requested
   plan and emails the key to the customer via SMTP (§5 mail config), with a link back to
   `/login`. If SMTP isn't configured, the key is shown on screen to send manually — nothing
   is blocked.
3. Admin can later **upgrade/downgrade** the licence from **Licenses** → "Change plan…".

**Issuing/editing licences directly (Holagundi platform admin):** `/platform-admin` →
**Licenses** (create, change plan, extend/suspend/revoke, manage devices) · **Organizations**
· **Products & plans** · **API keys** · **Accounts** (search any customer account, manually
reset their password — for support/lockout, not a self-serve "forgot password" flow). A
licensing install auto-seeds one demo licence per tier: `demo.lite1@aorms.in` / `demo.core1`
/ `demo.enterprise1`, password `demo1234`.

**Platform-admin accounts — one-time bootstrap, then closed:**
- **First admin:** open `/platform-admin` → "Need an account? Create one" → register with an
  email in `PLATFORM_ADMIN_EMAILS` (≥8-char password). That account is auto-granted admin.
- **Self-signup then closes** — for `/platform-admin` only. Once *any* platform admin exists,
  the "Create one" toggle disappears there and `POST /platform/auth/register` (without
  `portal: true`) returns `registration_closed` — the console is **sign-in only**.
  Status: `GET /platform/auth/registration-status`. **Customer sign-up at `/login` (the
  merged "Create account" flow) is never affected** — it's always open (`portal: true` on
  register).
- **Add more admins later:** add the email to `PLATFORM_ADMIN_EMAILS` + `deploy/update.sh`;
  that account is **auto-promoted to admin on its next sign-in** (`loginWithPassword`). It must
  already exist — create it at `/login` (Create account) first, then sign in at
  `/platform-admin` once promoted.

---

## 8. AORMS Identity operations

**Account management (`hlp_account` — plan, companies, 2FA, credentials) — two entry
points, no dedicated URL of its own:**
- **Inside the firm workspace:** Profile → **Account** tab. Sign in with the account's
  email/password there once (a separate `hlp_session` cookie from the workspace's own
  session) — the tab then shows:
  - **Request a workspace** — pick Lite/Core/Enterprise; see pending/approved status (§7).
  - **Two-factor authentication** — enable an authenticator app (TOTP; Google Authenticator,
    Authy, 1Password…). Scan the `otpauth://` URI or enter the secret, confirm a 6-digit
    code; thereafter login requires that code. Disable needs a current code.
  - **Active company** switcher (multiple ACTIVE memberships).
  - **Your companies** — create / join / leave a company. Joining **auto-activates** if your
    email domain matches the company's login-domain, else it's INVITED pending approval.
  - **My credentials** — your portable certifications + growth (keyed to `AORMS-U-`).
- **From `/platform-admin`:** the same panels appear inline via **"My account (2FA,
  profile)"** — a toggle on the console itself, for a platform admin (or any signed-in
  account without a firm workspace to reach Profile from) to manage their own account
  without leaving the console or signing in again.

**Admin console (`/platform-admin`), platform admins only:** Requests · Licenses ·
Organizations · Products & plans · API keys · **Accounts** (manual password reset). Inside
**Organizations** → a **Members** manager: invite / set-status / issue a certification to a
member.

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
| `/download` | Retired — redirects to `/wiki/getting-started`; no installer fetch needed |
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
