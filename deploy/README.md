# ESTI AORMS — Deployment

One menu installer, six profiles. The install flow is identical for every profile
(`deploy/lib.sh` → `install_core`); a profile only changes a few `.env` knobs
(`VITE_PUBLIC_SITE`, `SEED_DEMO`, `FIRM_PLAN`, and the licensing/Google vars).

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh        # ← pick a profile from the menu
```

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
| `deploy/lib.sh` | Shared helpers + `write_env` + `install_core` (the one install flow) |
| `deploy/update.sh` | In-place update (reads the profile from `.env`) |
| `deploy/backup.sh` / `restore.sh` | Postgres + MinIO backup / restore |
| `deploy/nginx-proxy.conf` | nginx vhost template |

## Before a first install

1. **Point DNS first** — `A` record for your domain → the VPS public IP (certbot
   issues TLS during install and fails if DNS doesn't resolve yet).
2. Open ports **22, 80, 443**.
3. SSH in as **root** on Ubuntu 22.04 / 24.04.

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

## Profile 5 — Licensing & Google sign-in

The licensing platform is mounted at `/platform` (admin UI `/platform-admin`).
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
