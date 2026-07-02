# ESTI AORMS — Deployment

> **Full step-by-step guide:** [`docs/esti/VPS-INSTALL.md`](../docs/esti/VPS-INSTALL.md)
> (specs, DNS, swap, prompts, verification, day-2 ops, troubleshooting). This file
> is the quick reference.

One menu installer, six profiles. The install flow is identical for every profile
(`deploy/lib.sh` → `install_core`); a profile only changes a few `.env` knobs
(`VITE_PUBLIC_SITE`, `SEED_DEMO`, `FIRM_PLAN`, and the licensing/Google vars).

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh        # ← pick a profile from the menu
```

> **Customer self-hosting Core / Enterprise?** Use the focused, firm-only installer
> instead: `sudo bash deploy/install-firm.sh` (edition prompt, licence-key activation,
> no landing/demo/licensing console). See
> [`docs/esti/SELF-HOST-INSTALL.md`](../docs/esti/SELF-HOST-INSTALL.md). `install.sh`
> below is Holagundi's own multi-profile deployment.

## Profiles

| # | Profile | Public site | Demo data | Plan | Notes |
|---|---|---|---|---|---|
| 1 | **Landing page only** | ✅ | — | Enterprise | Public marketing site; owner account only |
| 2 | **Production demo** | ✅ | ✅ seeded | Enterprise | One-click `/demo` auto-login (no manual login) |
| 3 | **AORMS Core** | — | — | **Core** | Firm workspace, `/login` at root |
| 4 | **AORMS Enterprise** | — | — | **Enterprise** | Firm workspace, all features |
| 5 | **Licensing & Account** | — | — | Enterprise | Licensing platform `/platform` + admin `/platform-admin` |
| 6 | **Learning & Certification** | — | — | — | In the pipeline — the menu exits gracefully |

## Files

| File | Role |
|---|---|
| `deploy/install.sh` | **The installer.** Menu → sets profile env → runs `install_core` |
| `deploy/install-firm.sh` | **Customer Core/Enterprise self-host** — firm-only front door + licence-key activation; reuses `install_core` |
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
PROFILE=core DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in SELF_SIGNED_CERT=true \
  sudo -E bash deploy/install.sh
```

This is intended as a bootstrapping convenience — replace the self-signed
certificate with a real certificate (Certbot) once DNS and rate limits permit:

```bash
# When ready on the VPS as root:
certbot --nginx -d aorms.in --non-interactive --agree-tos -m admin@aorms.in --redirect
systemctl reload nginx
```

The installer prompts for: domain, TLS email, branch, DB / session / MinIO secrets
(Enter = auto-generate), and the owner account. Profile 2 also asks for the demo
password (keep `demo1234` — the one-click `/demo` button has it baked in). Profile 5
also asks for platform-admin emails.

### Non-interactive

```bash
PROFILE=core DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD=… \
  sudo -E bash deploy/install.sh
```

`PROFILE` ∈ `landing | demo | core | enterprise | licensing | learning`. Any value
you don't pass as an env var is prompted for.

## Licensing & Account — base profile 5 *or* an add-on

The licensing platform (`/platform`, admin `/platform-admin`) is mounted in **every**
deployment, so it can layer onto any profile. The installer offers it as a `y/N`
add-on after you pick profile 2/3/4 — e.g. **2 + licensing = Landing + Demo +
Licensing** on one box. Non-interactive: add `WITH_LICENSING=true`.

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
