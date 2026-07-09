# AORMS — VPS Deployment Guide

Complete, start-to-finish guide for deploying AORMS on a fresh Ubuntu VPS. The
installer (`deploy/install.sh`) does everything — Docker, nginx, TLS, seeding,
auto-start. You only provision the box, point DNS, and run the installer.

> Quick reference for the scripts is in [`deploy/README.md`](../../deploy/README.md).
> Public documentation: [wiki.aorms.in](https://wiki.aorms.in).
> Legacy Lite installer guide: [`docs/archive/esti/AORMS-LITE-AND-GOOGLE-AUTH.md`](../archive/esti/AORMS-LITE-AND-GOOGLE-AUTH.md).

---

## 0. TL;DR

```bash
# On a fresh Ubuntu 22.04/24.04 VPS, as root, AFTER pointing DNS at this box:
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh          # default: landing + main app (the AORMS site)
```

~5–8 min later you're live at `https://<your-domain>` with TLS.

---

## 1. What gets deployed

One box runs six containers behind the host's nginx (which terminates TLS):

```
            Internet (HTTPS)
                  │
            host nginx  ── TLS (Let's Encrypt), security headers, static SPA
                  │  proxies /trpc /upload /calendar /health /readyz /storage
                  ▼
   ┌──────────── docker (compose.prod.yaml) ────────────┐
   │  backend (127.0.0.1:4000)  ─ Fastify + tRPC         │
   │  worker                    ─ Python job consumer    │
   │  esti-db      (Postgres)   ─ internal only          │
   │  esti-redis   (Redis)      ─ internal only          │
   │  esti-minio   (S3 storage) ─ internal only          │
   │  frontend     (build-only) ─ compiles the SPA → dist│
   └────────────────────────────────────────────────────┘
```

- Only the **backend** binds a host port, and only on **loopback** (`127.0.0.1:4000`).
  Postgres/Redis/MinIO are never exposed to the internet.
- The SPA is built once and served as static files by nginx from `/opt/esti/frontend/dist`.
- A `systemd` unit (`esti.service`) starts the stack on boot.

---

## 2. Profiles

`deploy/install.sh` installs the **AORMS site by default — no menu**: the public
landing page + the main app, with the licensing platform and unified accounts
bundled. Other profiles are env overrides (`PROFILE=…`):

| `PROFILE` | Public landing | Demo data | Plan | Root when logged out |
|---|---|---|---|---|
| **aorms** (default) | ✅ | — | Pro | Landing (`/login`, `/account`) |
| `landing` | ✅ | — | Pro | Landing |
| `demo` | ✅ | ✅ seeded | Pro | Landing + seeded demo logins |
| `core` / `enterprise` | — | — | Pro | `/login` — prefer `deploy/install-enterprise.sh` |
| `licensing` | — | — | Pro | `/login` (+ platform) |
| `learning` | — | — | — | *(in pipeline — exits)* |

**Customer/self-hosted enterprise installs use their own front door** —
`sudo bash deploy/install-enterprise.sh` (firm workspace only, licence-key
activation; see `docs/esti/SELF-HOST-INSTALL.md`).

> **Legacy plan codes.** The installer still writes legacy `FIRM_PLAN` values
> (`CORE` / `ENTERPRISE`) — `asPlan()` folds both to **PRO**, so every profile
> above runs the Pro edition.

**Licensing & Account is also an add-on.** The `/platform` backend is mounted in
*every* deployment, so after picking 2/3/4 the installer asks
*"Also enable the Licensing & Account platform? [y/N]"*. So:

- **Landing + Demo + Licensing** = pick **2**, answer **y** to licensing.
- **Pro + Licensing** = pick **3/4**, answer **y**.

Not combinable (opposite `.env` knobs): Landing-only vs a firm profile; the two
Pro profiles (3 vs 4) with each other.

---

## 3. Provision the VPS

| | Minimum | Comfortable |
|---|---|---|
| OS | **Ubuntu 22.04 or 24.04 LTS** (x86_64) | same |
| RAM | **4 GB** | 8 GB |
| vCPU | 2 | 2–4 |
| Disk | 25 GB | 40 GB+ |

⚠️ **Do not use a 2 GB box.** The frontend build runs Vite with a 4 GB heap
(`--max-old-space-size=4096`); 2 GB will OOM-kill the build. On a 4 GB box, add
swap first (§4).

**Fresh OS reinstall?** If the box has *any* prior state (old Docker, a previous
install, leftover nginx/certbot), reinstall the OS for a clean slate — it avoids
stale-volume / old-vhost / partial-cert edge cases. A brand-new droplet needs no
reinstall.

---

## 4. Pre-flight (before running the installer)

1. **Point DNS first.** Add an `A` record: `your-domain.com` → the VPS public IP.
   Certbot validates over HTTP-01 and **fails if DNS doesn't resolve to this box yet.**
   Verify: `dig +short your-domain.com` returns the VPS IP.
   **Also add a `www` record** (`A` → the same IP, or a `CNAME` → the apex): the
   installer requests a SAN cert covering `www` and nginx 301-redirects
   `www` → apex, so search engines index one canonical host instead of flagging
   www/non-www duplicate content. If `www` DNS is missing the installer falls
   back to an apex-only certificate.
2. **Open ports 22, 80, 443** at the cloud firewall (the script also configures UFW).
3. **SSH in as root** (or a sudo user).
4. **Add swap if you're on 4 GB RAM:**
   ```bash
   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

---

## 5. Install

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh
```

### Interactive prompts (in order)

| Prompt | Notes |
|---|---|
| Profile (1–6) | See §2 |
| *Enable Licensing add-on? [y/N]* | Shown for profiles 2/3/4 |
| Domain | Hostname only, e.g. `aorms.in` |
| Your email | For the TLS certificate (Let's Encrypt renewal notices) |
| PostgreSQL password | **Enter = auto-generate** (recommended) |
| Session secret | **Enter = auto-generate** |
| MinIO root user / password | Default `esti-admin` / auto-generate |
| Owner email + password | Your **admin login** |
| Demo password *(demo profile)* | Default `demo1234` — the seeded demo logins use it |
| Platform admin emails *(if licensing)* | Comma-separated; who can sign into `/platform-admin` |

All secrets are written to `/opt/esti/.env` (chmod 600, root-only).

> **Licence authority.** A firm install (`ESTI_ROLE=node`) points at the central
> Holagundi platform for licences — `ESTI_LICENSE_API_URL=https://aorms.in/platform`
> by default. The node stays unmanaged (runs on its `FIRM_PLAN`) until a licence is
> activated, so an empty `ESTI_PRODUCT_API_KEY` is safe; set the key to activate a
> real licence. Override `ESTI_LICENSE_API_URL` only if you self-host the platform.

### The Landing + Demo + Licensing recipe

```
sudo bash deploy/install.sh
→ 2                      # Demo (includes public landing + seeded demo)
→ y                      # Also enable Licensing & Account
→ aorms.in               # domain
→ you@firm.in            # TLS email
→ <Enter>                # auto-gen DB / session / MinIO secrets
→ owner@firm.in / ****   # owner login
→ <Enter>                # demo password = demo1234
→ you@firm.in            # platform admin email
```

### Non-interactive (CI / scripted)

```bash
PROFILE=demo WITH_LICENSING=true \
  DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' \
  PLATFORM_ADMIN_EMAILS=you@firm.in \
  sudo -E bash deploy/install.sh
```

`PROFILE` ∈ `landing | demo | core | enterprise | licensing | learning` (`core` and
`enterprise` are the legacy script names for the two AORMS Pro profiles). Any value
you don't pass is prompted for. Passwords left unset auto-generate.

---

## 6. What the installer does (`install_core`)

1. `apt` update/upgrade + base packages
2. Install Docker + Compose plugin
3. Install nginx + certbot
4. Configure UFW (allow 22/80/443)
5. Clone/refresh repo to `/opt/esti`
6. Write `/opt/esti/.env` from your inputs (profile knobs included)
7. `docker compose build` (3–5 min)
8. Start `esti-db` / `esti-redis` / `esti-minio`; wait for DB health; create the MinIO bucket
9. Start `backend` + `worker`; wait for `/health`
10. Seed owner/base data (`seed.js`); seed demo workspace (`seedDemo.js`) if `SEED_DEMO=true`
11. Build the frontend and copy `dist` to the host
12. Install the nginx vhost + issue TLS (`certbot --nginx --redirect`)
13. Install + enable the `esti` systemd unit (auto-start on reboot)

---

## 7. Verify

```bash
docker compose -f /opt/esti/compose.prod.yaml ps        # all Up / healthy
bash /opt/esti/scripts/smoke-health.sh http://127.0.0.1:4000
curl -sI https://your-domain.com | grep -i strict-transport   # HSTS present = TLS live
```

Then open `https://your-domain.com` and log in with the owner account.
- Demo profile: sign in at `https://your-domain.com/login` with `principal@demo.aorms.in` / the demo password.
- Licensing on: `https://your-domain.com/platform-admin`.

---

## 8. Platform admin sign-in (licensing only)

The licensing console at `/platform-admin` uses **email + password** — no Google,
nothing to configure. The admin allowlist is `PLATFORM_ADMIN_EMAILS` (you set it
during install). To get in:

1. Open `https://your-domain.com/platform-admin`.
2. Click **"Need an account? Create one"** and register with an email that is in
   `PLATFORM_ADMIN_EMAILS`, plus a password (≥8 chars). That account is granted
   platform admin automatically on first sign-up.
3. You land in the console — **Licenses · Organizations · Products & plans · API
   keys**. The licensing install auto-seeds one demo licence per tier
   (`demo.lite1@aorms.in` / `demo.core1` / `demo.enterprise1`, password `demo1234`).

To change the admin allowlist later:

```bash
cd /opt/esti
# edit .env → PLATFORM_ADMIN_EMAILS=you@firm.in,ops@firm.in
bash deploy/update.sh
```

---

## 9. Day-2 operations

**Update to the latest code** (profile remembered in `.env`):
```bash
cd /opt/esti
bash deploy/update.sh                     # pull, rebuild, atomic dist swap, idempotent re-seed
GIT_BRANCH=feat/x bash deploy/update.sh   # a specific branch
REFRESH_NGINX=true bash deploy/update.sh  # also re-apply the nginx vhost
```

**Backups & restore:**
```bash
bash deploy/backup.sh /opt/esti/backups   # Postgres dump + MinIO volume tarball
bash deploy/restore.sh /opt/esti/backups/esti-pg-YYYYMMDD-HHMMSS.sql.gz
```
Add `backup.sh` to root's crontab for daily dumps.

**Service control:**
```bash
docker compose -f /opt/esti/compose.prod.yaml ps
docker compose -f /opt/esti/compose.prod.yaml logs -f backend
systemctl restart esti                    # restart whole stack
```

**Switch profile** without reinstalling (e.g. demo → firm Pro):
```bash
cd /opt/esti
sed -i 's/^VITE_PUBLIC_SITE=.*/VITE_PUBLIC_SITE=false/;s/^SEED_DEMO=.*/SEED_DEMO=false/;s/^FIRM_PLAN=.*/FIRM_PLAN=PRO/' .env
bash deploy/update.sh
```
Legacy `FIRM_PLAN=CORE` / `FIRM_PLAN=ENTERPRISE` values still resolve to Pro.

---

## 9a. Desktop installers (retired)

The Windows Lite/Pro/Enterprise `/download` portal and `fetch-installers.sh` flow
were **retired 2026-07**. New deployments serve the **cloud workspace** only.
`/download` on the marketing site redirects to the wiki.

Operators on legacy VPS layouts may still have `frontend/dist/downloads/` from an
older install — safe to delete. See [ADMIN-GUIDE](ADMIN-GUIDE.md) §6b.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Certbot fails at TLS step | DNS not pointing here yet. Fix the `A` record, then re-run `sudo bash deploy/install.sh` (or `certbot --nginx -d <domain> --redirect`). |
| Frontend build killed / OOM | < 4 GB RAM and no swap. Add swap (§4), re-run. |
| `esti-db is unhealthy` | Stale half-init volume. `docker compose -f compose.prod.yaml down -v` then re-run the installer (it auto-generates a DB password). |
| Demo login → 401 | `SEED_DEMO_PASSWORD` in `.env` ≠ `demo1234`. Set it back, then `docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js`. |
| Landing/blog only load when logged in | Frontend built firm (`VITE_PUBLIC_SITE=false`). Set it `true` and `bash deploy/update.sh`. |
| HTTPS gone after a manual nginx edit | `certbot --nginx -d <domain> --reinstall --redirect && systemctl reload nginx`. |

---

## 11. Security posture (already hardened)

- Backend bound to `127.0.0.1` only; DB/Redis/MinIO have no host ports.
- Session cookies: `httpOnly` + `sameSite=strict` + `secure` (HTTPS-only).
- Rate limiting (600/min), 50 MB upload cap, nginx security headers + HSTS + `server_tokens off`.
- Secrets in `.env` (chmod 600); `*.pem`/`*.key`/`.keys/` git-ignored; license signing key is env-only.
- HTTP → HTTPS forced (certbot `--redirect`).

See [PRODUCTION-OPS.md](PRODUCTION-OPS.md) for the full ops runbook.

*Last updated: 2026-06-30*
