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
| **aorms** (default) | ✅ | — | Standard | Landing + main app + licensing + `/wiki` docs |
| `landing` | ✅ | — | Standard | Public marketing site |
| `demo` | ✅ | ✅ seeded | Standard | Seeded demo workspace |
| `core` / `enterprise` | — | — | Standard | Firm workspace — prefer `install-enterprise.sh` |
| `licensing` | — | — | Standard | Licensing platform without public site |
| `learning` | — | — | — | In the pipeline — exits gracefully |

## Files

| File | Role |
|---|---|
| `deploy/install.sh` | **AORMS-site installer (default: aorms profile)** → sets profile env → runs `install_core` |
| `deploy/install-enterprise.sh` | **Customer Core/Enterprise self-host** — firm-only front door + licence-key activation; reuses `install_core` |
| `deploy/install-admin-console.sh` | **Licensing console at `admin.DOMAIN`** — vhost + TLS for the `dist/admin.html` entry; same-box `/platform/` proxy (run after the main install; needs the `admin.` DNS record) |
| `deploy/install-wiki-tls.sh` | **Legacy `wiki.DOMAIN`** — optional TLS so HTTPS redirects to `https://DOMAIN/wiki` (HTTP redirect block is in `nginx-proxy.conf`) |
| `deploy/lib.sh` | Shared helpers + `write_env` + `install_core` (the one install flow) |
| `deploy/update.sh` | In-place update (reads the profile from `.env`) |
| `deploy/cleanup-vps.sh` | **VPS hygiene** — remove retired `/downloads` installers, `dist.old`, temp Docker containers; optional image/build-cache prune |
| `deploy/fetch-installers.sh` | **Retired** — legacy Lite/Pro desktop installers (see archive docs) |
| `deploy/backup.sh` / `restore.sh` | Postgres + MinIO backup / restore |
| `deploy/nginx-proxy.conf` | nginx vhost template |

## Desktop installers (retired 2026-07)

Full AORMS Lite/Pro/Manager `/download` hosting was **retired**. The product is
cloud-only at aorms.in; `/download` redirects to the wiki. The script
`fetch-installers.sh` and workflow `desktop.yml` remain for legacy VPS layouts
only.

The separate **AORMS Estimate** app (`estimate/`) uses `.github/workflows/estimate.yml`.

## Before a first install

1. **Point DNS first** — `A` record for your domain → the VPS public IP (certbot
   issues TLS during install and fails if DNS doesn't resolve yet). Add a
   `www` record too (`A` → the same IP, or a `CNAME` → the apex): the installer
   requests a SAN cert covering `www` and nginx 301-redirects `www` → apex so
   search engines see one canonical host. If `www` DNS is absent the installer
   falls back to an apex-only cert.
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
# When ready on the VPS as root (include www for the canonical redirect cert):
certbot --nginx -d aorms.in -d www.aorms.in --non-interactive --agree-tos -m admin@aorms.in --redirect
systemctl reload nginx
```

The installer prompts for: domain, TLS email, DB / session / MinIO secrets
(Enter = auto-generate), the owner account, **outbound SMTP (optional — blank
host skips it; licence keys, verification links, password resets and
invitations all send through it, and sending degrades gracefully until it's
set in `.env`)**, and (when the platform is on — always for the default
profile) the platform-admin emails. The `demo` profile
also asks for the demo password (default `demo1234`, used by the seeded demo
logins at `/login`).

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

Deploy the console with `sudo bash deploy/install-admin-console.sh` (after the
main install + an `admin.DOMAIN` DNS record): it serves the build's
`dist/admin.html` entry on its own vhost with a same-box `/platform/` proxy and
provisions TLS. A separate console repo can claim the subdomain instead — this
script is just the built-in path. Set `VITE_ADMIN_URL=""` (empty) in `.env`
before installing/updating to keep the embedded console at `/platform-admin`
(the default for installs without the platform).

Google sign-in needs an OAuth client — set in `.env` after install (no code change):

```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GOOGLE_REDIRECT_URI=https://<domain>/platform/auth/google/callback
PLATFORM_ADMIN_EMAILS=you@firm.in
```

then `bash deploy/update.sh`. Google OAuth: set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` (legacy Lite guide: `docs/archive/esti/AORMS-LITE-AND-GOOGLE-AUTH.md`).

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

### VPS cleanup (retired installers, ESE, build cruft)

Desktop `/downloads` and **ESE** (`esti-ese`) were retired (cloud-only; estimation teardown).
On an existing box:

```bash
cd /opt/esti
git pull
bash deploy/cleanup-vps.sh                              # dry-run — shows what would go
sudo APPLY=true REMOVE_ESE=true REMOVE_ORPHANS=true \
  PRUNE_DOCKER=true bash deploy/cleanup-vps.sh            # apply: ESE, orphans, Docker cache
bash deploy/update.sh                                   # rebuild frontend + re-seed demo if enabled
```
