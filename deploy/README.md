# AORMS — Deployment

> **Full step-by-step guide:** [`docs/esti/VPS-INSTALL.md`](../docs/esti/VPS-INSTALL.md)
> (specs, DNS, swap, prompts, verification, day-2 ops, troubleshooting). This file
> is the quick reference.

Two front doors, one tested install flow (`deploy/lib.sh` → `install_core`);
a profile only changes a few `.env` knobs (`VITE_PUBLIC_SITE`, `SEED_DEMO`,
`FIRM_PLAN`, and the licensing/Google vars).

**The AORMS site (default — no menu):** landing page + the main app + the
licensing platform + unified accounts, on one box:

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh
```

**Customer/self-hosted enterprise:** firm workspace only — no landing, no demo,
no licensing console; licence-key activation against aorms.in:

```bash
sudo bash deploy/install-enterprise.sh
```

See [`docs/esti/SELF-HOST-INSTALL.md`](../docs/esti/SELF-HOST-INSTALL.md).

## Profiles (`PROFILE=` overrides on `install.sh`)

| Profile | Public site | Demo data | Plan | Notes |
|---|---|---|---|---|
| **aorms** (default) | ✅ | — | Enterprise→PRO | Landing + main app + licensing platform + unified accounts |
| `landing` | ✅ | — | Enterprise→PRO | Public marketing site only; owner account only |
| `demo` | ✅ | ✅ seeded | Enterprise→PRO | One-click `/demo` auto-login (no manual login) |
| `core` / `enterprise` | — | — | Core/Ent→PRO | Firm workspace — prefer `install-enterprise.sh` |
| `licensing` | — | — | Enterprise→PRO | Licensing platform without the public site |
| `learning` | — | — | — | In the pipeline — exits gracefully |

## Files

| File | Role |
|---|---|
| `deploy/install.sh` | **AORMS-site installer (default: aorms profile)** → sets profile env → runs `install_core` |
| `deploy/install-enterprise.sh` | **Customer Core/Enterprise self-host** — firm-only front door + licence-key activation; reuses `install_core` |
| `deploy/lib.sh` | Shared helpers + `write_env` + `install_core` (the one install flow) |
| `deploy/update.sh` | In-place update (reads the profile from `.env`) |
| `deploy/fetch-installers.sh` | Pull the desktop installers from a GitHub Release → host on `/download` |
| `deploy/backup.sh` / `restore.sh` | Postgres + MinIO backup / restore |
| `deploy/nginx-proxy.conf` | nginx vhost template |

## Desktop installers on /download

Windows `.exe` installers can't be built on a Linux VPS. GitHub Actions
(`.github/workflows/desktop.yml`, **windows-latest**) builds all three editions and
publishes them on a `desktop-v*` tag; the VPS just hosts them:

```bash
# 1. Build (once): GitHub → Actions → desktop-installer → Run workflow,
#    or push a tag:  git tag desktop-v1.0.0 && git push origin desktop-v1.0.0
# 2. On the VPS (needs gh authed for a private repo: `gh auth login`):
cd /opt/esti && bash deploy/fetch-installers.sh        # latest desktop-v* release
```
It downloads the 3 `.exe`, sets `VITE_*_DOWNLOAD_URL` in `.env`, rebuilds the SPA so
the buttons go live, and serves them under `/downloads/`. `update.sh` preserves them
across future deploys.

## Before a first install

1. **Point DNS first** — `A` record for your domain → the VPS public IP (certbot
   issues TLS during install and fails if DNS doesn't resolve yet).
2. Open ports **22, 80, 443**.
3. SSH in as **root** on Ubuntu 22.04 / 24.04.

### Temporary self-signed TLS (fresh VPS or rate-limit safety)

If you are installing on a fresh VPS or want to avoid Let's Encrypt rate limits,
set `SELF_SIGNED_CERT=true` in the environment when running the installer. The
installer will generate a short-lived self-signed certificate and configure
nginx to serve HTTPS immediately. Example:

```bash
DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in SELF_SIGNED_CERT=true \
  sudo -E bash deploy/install.sh
```

This is intended as a bootstrapping convenience — replace the self-signed
certificate with a real certificate (Certbot) once DNS and rate limits permit:

```bash
# When ready on the VPS as root:
certbot --nginx -d aorms.in --non-interactive --agree-tos -m admin@aorms.in --redirect
systemctl reload nginx
```

The installer prompts for: domain, TLS email, DB / session / MinIO secrets
(Enter = auto-generate), the owner account, **outbound SMTP (optional — blank
host skips it; licence keys, verification links, password resets and
invitations all send through it, and sending degrades gracefully until it's
set in `.env`)**, and (when the platform is on — always for the default
profile) the platform-admin emails. The `demo` profile
also asks for the demo password (keep `demo1234` — the one-click `/demo` button
has it baked in).

### Non-interactive

```bash
DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD=… PLATFORM_ADMIN_EMAILS=you@firm.in \
  sudo -E bash deploy/install.sh
```

`PROFILE` ∈ `aorms (default) | landing | demo | core | enterprise | licensing |
learning`. Any value you don't pass as an env var is prompted for.

## Licensing & Account — bundled by default, or an add-on

The licensing platform (`/platform`) is mounted in **every** deployment and is
**on by default** for the `aorms` profile (and `licensing`). On the `demo`
profile the installer offers it as a `y/N` add-on (non-interactive:
`WITH_LICENSING=true`); customer `core`/`enterprise` installs never bundle it.

### Licensing console on its own subdomain (`admin.DOMAIN`)

The **licensing console UI** is its own deployment (separate repo), served at
`admin.DOMAIN`. When the platform is enabled, the installer defaults
`VITE_ADMIN_URL=https://admin.DOMAIN` into `.env`, which does two things:

- `https://DOMAIN/platform-admin` redirects to the console origin, and
- `ALLOWED_ORIGINS` includes the console origin, so its frontend may call this
  backend's `/platform` API with credentials — CORS and the CSRF origin gate
  both accept it, and the `hlp_session` cookie rides along because the API
  requests target `DOMAIN` itself (same-site from `admin.DOMAIN`).

The subdomain's own nginx vhost + TLS belong to the console repo's deploy — this
repo does not claim `admin.DOMAIN`. Set `VITE_ADMIN_URL=""` (empty) in `.env`
before installing/updating to keep the embedded console at `/platform-admin`
instead (the default for installs without the platform).

Google sign-in needs an OAuth client — set in `.env` after install (no code change):

```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GOOGLE_REDIRECT_URI=https://<domain>/platform/auth/google/callback
PLATFORM_ADMIN_EMAILS=you@firm.in
```

then `bash deploy/update.sh`. See [`docs/esti/AORMS-LITE-AND-GOOGLE-AUTH.md`](../docs/esti/AORMS-LITE-AND-GOOGLE-AUTH.md).

## Switching profiles on an existing box

The profile is just `.env` keys. e.g. demo → firm-core:

```bash
cd /opt/esti
sed -i 's/^VITE_PUBLIC_SITE=.*/VITE_PUBLIC_SITE=false/;s/^SEED_DEMO=.*/SEED_DEMO=false/;s/^FIRM_PLAN=.*/FIRM_PLAN=CORE/' .env
bash deploy/update.sh
```

## Backups & DR

```bash
bash deploy/backup.sh /opt/esti/backups
bash deploy/restore.sh /opt/esti/backups/esti-pg-YYYYMMDD-HHMMSS.sql.gz
```

Add `backup.sh` to root's crontab for daily dumps. Health check:
`bash scripts/smoke-health.sh http://127.0.0.1:4000`.
