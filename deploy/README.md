# ESTI AORMS — Deployment

Two build variants, one shared core. Nothing is duplicated: the variant is chosen by
two flags persisted in `.env` (`VITE_PUBLIC_SITE`, `SEED_DEMO`), and every script reads
from that single source of truth.

| Variant | Public marketing site | Demo data | Root `/` when logged out | Use for |
|---|---|---|---|---|
| **demo-prod** | landing, blog, investors, legal, one-click `/demo` | seeded | Landing page | `aorms.in` — the public product/demo |
| **firm-prod** | none | none | redirect to `/login` | a practice's private workspace |

## Files

| File | Role |
|---|---|
| `compose.prod.yaml` | Base compose (shared by both variants) |
| `compose.firm.yaml` | Optional explicit firm overlay (manual builds) |
| `deploy/setup-vps.sh` | **Core** first-time installer (VARIANT-aware) |
| `deploy/deploy.sh` | **Core** in-place updater (reads variant from `.env`) |
| `deploy/install-demo.sh` | First install → demo-prod (wrapper) |
| `deploy/install-firm.sh` | First install → firm-prod (wrapper) |
| `deploy/update.sh` | Update an existing deployment (wrapper) |
| `deploy/backup.sh` / `restore.sh` / `restore-drill.sh` | Postgres + MinIO backup / restore / DR drill |
| `deploy/verify-frontend.sh` | Post-build sanity check of `frontend/dist` |
| `deploy/lib.sh` | Shared shell helpers (sourced, not run) |

The wrappers contain **no logic** — they `exec` the core scripts with the right
`VARIANT`. Fix a bug once, in the core.

---

## Before any first install

1. **Point DNS first.** Add an `A` record for your domain → the VPS public IP. Certbot
   issues TLS during install and will fail if DNS doesn't resolve to this box yet.
2. Open ports **22, 80, 443** at the cloud firewall (the script also configures UFW).
3. SSH in as **root** (or a sudo user) on Ubuntu 22.04 / 24.04.

---

## Flow 1 — Install the public demo (demo-prod)

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install-demo.sh
```

Interactive prompts: domain, TLS email, branch, DB/MinIO passwords (press Enter to
auto-generate), owner email + password, and the demo password.

> **Keep the demo password `demo1234`.** The public one-click demo button has it baked
> into the frontend; changing it breaks that button. The installer warns you if you do.

Seeds your real **owner** (full system-admin) *and* the demo workspace
(`principal@demo.aorms.in` / `demo1234`).

## Flow 2 — Install the firm product (firm-prod)

```bash
apt-get update && apt-get install -y git
git clone --branch main https://github.com/HolagundiWorks/esti.git /opt/esti
cd /opt/esti
sudo bash deploy/install-firm.sh
```

Same prompts **minus** the demo password (none is needed). Writes
`VITE_PUBLIC_SITE=false` and `SEED_DEMO=false` to `.env`, so the frontend ships without
the marketing site and no demo data is seeded. Only your owner account is created.

## Flow 3 — Update an existing deployment

From the deploy dir, after either install — variant is remembered in `.env`:

```bash
cd /opt/esti
bash deploy/update.sh
```

Options:

```bash
GIT_BRANCH=feat/xyz bash deploy/update.sh   # deploy a specific branch
REFRESH_NGINX=true  bash deploy/update.sh   # also re-apply the nginx template + TLS
```

`update.sh` pulls code, rebuilds images, swaps `frontend/dist` **atomically** (a failed
build never leaves the site empty), rolling-restarts backend→worker, runs idempotent
seeds, and pings IndexNow.

> **It does not touch nginx/TLS by default** — that was a past bug (each deploy wiped
> certbot's TLS block and dropped the site to HTTP). Only `REFRESH_NGINX=true` rewrites
> the vhost, and it re-applies TLS afterward.

---

## Switching an existing box between variants

The variant is just two `.env` keys. To convert, e.g. demo → firm:

```bash
cd /opt/esti
sed -i 's/^VITE_PUBLIC_SITE=.*/VITE_PUBLIC_SITE=false/' .env
sed -i 's/^SEED_DEMO=.*/SEED_DEMO=false/' .env
bash deploy/update.sh        # rebuilds the frontend without the marketing site
```

(Existing demo data is left in the DB; wipe it separately if you want it gone.)

---

## Backups & DR

```bash
bash deploy/backup.sh /opt/esti/backups     # Postgres dump + MinIO volume tarball
bash deploy/restore.sh /opt/esti/backups/esti-pg-YYYYMMDD-HHMMSS.sql.gz
bash deploy/restore-drill.sh /opt/esti/backups   # staging-only: restore + health check
```

Add `backup.sh` to root's crontab for daily dumps. See
[`docs/esti/PRODUCTION-OPS.md`](../docs/esti/PRODUCTION-OPS.md) for the full runbook.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `esti-db is unhealthy`, deps fail | Empty/blank DB password, or a stale half-init volume. Check `docker logs esti-db`. Fresh box: `docker compose -f compose.prod.yaml down -v` then re-run the installer (it auto-generates a password if you leave it blank). |
| Demo login → 401 | `SEED_DEMO_PASSWORD` in `.env` ≠ `demo1234`. `sed -i 's/^SEED_DEMO_PASSWORD=.*/SEED_DEMO_PASSWORD=demo1234/' .env`, then `docker compose -f compose.prod.yaml up -d backend && docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js`. |
| HTTPS gone / site slow after a deploy | An older `deploy.sh` rewrote the vhost. Restore: `certbot --nginx -d YOURDOMAIN --non-interactive --reinstall --redirect && systemctl reload nginx`, then pull latest (this is fixed). |
| Blog/investors only load when logged in | The frontend was built firm (`VITE_PUBLIC_SITE=false`). For the public site set it `true` in `.env` and `bash deploy/update.sh`. |
| MinIO not in backups | Fixed — `backup.sh` now resolves the project-prefixed `esti-aorms-prod_miniodata` volume. |

Health check anytime: `bash scripts/smoke-health.sh http://127.0.0.1:4000`.
