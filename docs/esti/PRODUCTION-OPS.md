# Production operations checklist

Use this before declaring a VPS instance production-ready. Engineering delivery
through [Phase 20](ROADMAP.md) is complete; this checklist is the **operator gate**
for a live firm instance (secrets, TLS, backup/restore drill).

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
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:solo:prod
# Repair passwords + print login status:
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:sync-demo:prod
```

| Account | Email | Password |
|---------|-------|----------|
| Studio demo | `principal@demo.aorms.in` | `demo1234` (or `SEED_DEMO_PASSWORD`) |
| Solo demo | `solo@demo.aorms.in` | same |

See [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md).

---

## Landing page ESTI AI (Ollama required)

Prompts and Ollama client live in **`@hcw/aorms-ai-kit`** (sibling repo `hcw-aorms-ai-kit`). Rebuild backend after bumping that package version. See [KITS.md](../KITS.md).

The public marketing site exposes **Ask ESTI** (`marketing.askEsti`) — product FAQ powered by on-server Ollama. There is **no mock fallback** on the landing page; if Ollama is down, visitors see a friendly unavailable message.

**Prerequisites**

1. `esti-ollama` service running in `compose.prod.yaml` (or `OLLAMA_BASE_URL` pointing to a reachable host).
2. Model pulled: `docker compose -f compose.prod.yaml exec esti-ollama ollama pull llama3.2` (or your `OLLAMA_MODEL`).
3. Rebuild backend after deploy so `landing-gateway` is in the image.

**Verify**

```bash
docker compose -f compose.prod.yaml exec esti-ollama ollama list
curl -s http://127.0.0.1:11434/api/tags | head
```

Open the site → corner **Ask ESTI** → ask “What is CRIF?” — expect an answer about the project change register.

---

## Beta request form (internal landing form + SMTP)

The **Request beta testing access** form on the landing page (`#beta`) is built into AORMS — **not** Google Forms. Each submission is:

1. Saved in PostgreSQL (`esti_trial_request`)
2. Emailed to **`BETA_REQUEST_NOTIFY_TO`** (default `hi@aorms.in`) when SMTP is configured

Configure your **mailbox SMTP** in `/opt/esti/.env` using credentials from your mail host panel (Hostinger, cPanel, Zoho Mail, Postfix on the same VPS, etc.):

```env
SMTP_HOST=mail.aorms.in
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hi@aorms.in
SMTP_PASS=your_mailbox_password
SMTP_FROM="AORMS Beta <hi@aorms.in>"
BETA_REQUEST_NOTIFY_TO=hi@aorms.in
```

| Port | `SMTP_SECURE` | Typical use |
|------|---------------|-------------|
| 587 | `false` | STARTTLS (most hosts) |
| 465 | `true` | Implicit SSL |

**Where to find settings**

- **Hostinger / similar:** hPanel → Emails → your mailbox → Connect apps / SMTP settings
- **cPanel:** Email Accounts → Connect Devices → outgoing server `mail.yourdomain.com`
- **Zoho Mail:** Mail → Settings → Mail accounts → SMTP

Restart backend after editing `.env`:

```bash
docker compose -f compose.prod.yaml up -d backend
```

**Test SMTP before going live**

```bash
docker compose -f compose.prod.yaml exec backend node backend/dist/scripts/testSmtp.js
```

Expect `✓ test message sent to hi@aorms.in` and the message in your inbox.

**Verify a real form submission**

```bash
docker compose -f compose.prod.yaml logs backend --tail 30

docker compose -f compose.prod.yaml exec db psql -U esti -d esti -c \
  "SELECT full_name, work_email, company_name, created_at FROM esti_trial_request ORDER BY created_at DESC LIMIT 5;"
```

If SMTP is missing, submissions are **still saved**; backend logs: `beta request … saved but email not sent`.

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
