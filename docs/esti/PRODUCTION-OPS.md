# Production operations checklist

Use this before declaring a VPS instance production-ready. Pair with [Phase 12 in ROADMAP](ROADMAP.md#phase-12---production-readiness-p0--partial).

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

1. Point DNS A/AAAA records at the VPS.
2. Run `deploy/bootstrap.sh` or install `deploy/nginx-proxy.conf` with your domain.
3. Obtain TLS (Certbot / Let's Encrypt) — nginx terminates HTTPS and proxies to backend `:4000`.
4. Confirm `curl -I https://your-domain` returns `200` and HSTS if configured.

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
- Worker limits / idempotency: [WORKER-LIMITS.md](WORKER-LIMITS.md)

---

## List caps

Office-wide queries use `clampListLimit()` (default 100, max 500). Activity feed uses cursor pagination. Raise caps only after profiling — prefer filters and pagination over unbounded scans.
