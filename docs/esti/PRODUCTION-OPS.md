# Production operations checklist

Use this before declaring a VPS instance production-ready. Engineering delivery through [Phase 12](ROADMAP.md#phase-12---production-readiness-p0) is complete; this checklist is the **operator gate** for a live firm instance.

---

## Secrets and environment

1. Copy `deploy/.env.production.example` → `.env` on the VPS.
2. Replace **every** `CHANGE_ME_*` value — `bootstrap.sh` refuses placeholders except domain/session auto-fill.
3. Generate strong secrets:
   - `openssl rand -hex 32` → `SESSION_SECRET`
   - `openssl rand -base64 24` → `POSTGRES_PASSWORD`, `S3_SECRET_KEY`
4. Set `ALLOWED_ORIGINS=https://your-domain` (exact SPA origin, no trailing slash).
5. Keep `COOKIE_SECURE=true` when serving over HTTPS.
6. For **real firm data**: use a unique `SEED_OWNER_EMAIL` / strong password; **do not** run `seed:demo`.
7. Store `.env` with `chmod 600`; never commit it.

---

## TLS and nginx

ESTI terminates TLS on **host nginx** (not inside Docker). Docker runs the API on `127.0.0.1:4000` only.

### Prerequisites

- DNS **A** record for your domain → VPS public IP
- Ports **80** and **443** open (`ufw allow 80/tcp`, `ufw allow 443/tcp`)
- HTTP site working first (nginx serves SPA from `/opt/esti/frontend/dist`)

### Fresh VPS (SSL included)

```bash
cd /opt/esti
bash deploy/setup-vps.sh
# prompts for domain + admin email; runs certbot at the end
```

Or one-shot bootstrap:

```bash
DOMAIN=aorms.in bash deploy/bootstrap.sh
```

### Enable SSL on an existing HTTP-only VPS

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

cd /opt/esti
DOMAIN=aorms.in   # hostname only — no https://

sudo cp deploy/nginx-proxy.conf /etc/nginx/sites-available/esti
sudo sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/esti
sudo sed -i "s|DEPLOY_DIR_PLACEHOLDER|/opt/esti|g" /etc/nginx/sites-available/esti
sudo ln -sf /etc/nginx/sites-available/esti /etc/nginx/sites-enabled/esti
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d "$DOMAIN" --agree-tos -m you@example.com --redirect
sudo systemctl reload nginx
```

Then update `.env`:

```env
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://aorms.in
```

Restart backend: `docker compose -f compose.prod.yaml up -d backend`

### Verify

```bash
curl -I https://your-domain
curl -s -o /dev/null -w "health %{http_code}\n" https://your-domain/health
sudo certbot certificates
sudo certbot renew --dry-run
```

Certbot installs a systemd timer for renewal.

---

## Database migrations

Schema is managed by committed SQL under `backend/drizzle/`. The backend applies pending migrations on startup; demo seeds also call `ensureDemoSchema()` before mutating data.

**Journal discipline:** every `backend/drizzle/NNNN_*.sql` file must appear in `backend/drizzle/meta/_journal.json`. Missing entries (historically `0041_wellbeing_opt_in`, `0048_ai_studio`) caused VPS columns to be absent while Drizzle ORM expected them. Repair migration `0056_schema_repair.sql` adds belt-and-suspenders `ADD COLUMN IF NOT EXISTS` for known drift.

After deploy, confirm migrations applied:

```bash
docker compose -f compose.prod.yaml logs backend --tail 30
docker compose -f compose.prod.yaml exec db psql -U esti -d esti -c \
  "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;"
```

---

## Demo seeds (public demo hosts only)

Run after deploy on **demo** instances — not production firm data:

```bash
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:solo:prod
```

| Account | Email | Password |
|---------|-------|----------|
| Studio demo | `principal@demo.aorms.in` | `demo1234` (or `SEED_DEMO_PASSWORD`) |
| Solo demo | `solo@demo.aorms.in` | same |

See [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md).

---

## Object storage (downloads)

MinIO runs **internal-only** in `compose.prod.yaml`. Presigned URLs need a browser-reachable host:

| Option | Action |
|--------|--------|
| **Managed S3 / B2** | Point `S3_ENDPOINT` + `S3_PUBLIC_ENDPOINT` at the provider; drop `esti-minio` if unused. |
| **Self-hosted MinIO** | Publish MinIO on `127.0.0.1:9000`, add nginx `files.your-domain` TLS proxy, set `S3_PUBLIC_ENDPOINT=https://files.your-domain`. |

Until wired, PDF/drawing downloads will not resolve in the browser.

---

## Backup and restore drill

Run on a **staging clone** before production cutover.

```bash
# 1. Backup (PostgreSQL + optional MinIO volume)
bash deploy/backup.sh /opt/esti/backups

# 2. Automated drill (stops backend/worker, restores latest pg dump, waits for /health)
bash deploy/restore-drill.sh /opt/esti/backups
```

Manual restore:

```bash
docker compose -f compose.prod.yaml stop backend worker
bash deploy/restore.sh /opt/esti/backups/esti-pg-YYYYMMDD-HHMMSS.sql.gz
docker compose -f compose.prod.yaml up -d backend worker
curl -s http://127.0.0.1:4000/health | jq .
curl -s http://127.0.0.1:4000/readyz | jq .
```

Sign-off: owner can log in, open a project, and download an existing PDF after restore.

### Staging sign-off record

Run on the **staging VPS clone** before production cutover. Record in your ops log (not in git):

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Operator | Name |
| Backup path | e.g. `/opt/esti/backups/esti-pg-…` |
| `restore-drill.sh` exit code | 0 |
| `/health` after drill | `ok: true` |
| Spot check | Login, project open, PDF download |

If the drill fails, do not declare production-ready — fix backup/restore paths first.

---

## Health probes

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Deploy gate — DB + Redis required (`ok: true`); revision + build metadata |
| `GET /readyz` | Full stack — DB + Redis + MinIO bucket (`503` if storage missing) |

Post-deploy: `bash scripts/smoke-health.sh http://127.0.0.1:4000`

Owner UI: **Company → Release & readiness** mirrors `system.release` tRPC.

---

## CI and release audit

- GitHub Actions: typecheck, lint, unit tests, backend + frontend production builds.
- Dependency licenses: `node scripts/licenses.mjs`
- Backend API smoke: `pnpm --filter @esti/backend test:api-smoke`
- Worker limits / idempotency: [WORKER-LIMITS.md](WORKER-LIMITS.md)

---

## List caps

Office-wide queries use `clampListLimit()` (default 100, max 500). Activity feed and project-scoped lists use cursor pagination. Raise caps only after profiling — prefer filters and pagination over unbounded scans.

---

## Deploy cadence

```bash
cd /opt/esti
git pull
bash deploy/deploy.sh
```

`deploy.sh` rebuilds images, extracts frontend `dist/` for host nginx, refreshes nginx config, and waits for `/health`.
