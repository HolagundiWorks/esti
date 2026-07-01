# AORMS — Self-Hosted Install (Core / Enterprise)

For a **firm that hosts AORMS on its own server**. This installs the AORMS firm
workspace only — **no** public marketing landing, **no** demo data, and **no**
licensing console. Your install is a *licence consumer*: it activates its Core or
Enterprise licence against the central AORMS platform at `aorms.in`.

> This is a separate front door from Holagundi's own deployment. Holagundi's site
> (landing + demo + the `/platform-admin` licensing console) uses `deploy/install.sh`;
> **customers use `deploy/install-firm.sh`** (this guide). Both share the same tested
> install core, so you get identical infrastructure — just a firm-only surface.

---

## 1. What you get

One server, six containers behind nginx (which terminates TLS):

```
Internet (HTTPS) → host nginx (TLS, static SPA, proxies /trpc /upload /storage …)
                     → backend 127.0.0.1:4000 (Fastify + tRPC)
                     → worker · Postgres · Redis · MinIO   (all internal only)
```

- Login is at `https://<your-domain>/login` — your firm's own users.
- Files are stored in the built-in MinIO (S3). Core+ can point at your own NAS/S3 later.
- Only the backend binds a port, on loopback only. DB/Redis/MinIO are never exposed.

## 2. Before you install

| | Minimum | Comfortable |
|---|---|---|
| OS | **Ubuntu 22.04 / 24.04 LTS** (x86_64) | same |
| RAM | **4 GB** (+4 GB swap) | 8 GB |
| vCPU | 2 | 2–4 |
| Disk | 25 GB | 40 GB+ |

1. **Point DNS first:** an `A` record `your-domain → server IP` (TLS issuance fails
   until it resolves). Check with `dig +short your-domain`.
2. Open ports **22, 80, 443**.
3. On a 4 GB box, add swap (the SPA build needs it):
   ```bash
   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```
4. **Get the deploy bundle from Holagundi** and place it at `/opt/esti` (Holagundi
   provides repo access, a deploy key, or a tarball), plus your **product API key**
   for licence activation.

## 3. Install

```bash
cd /opt/esti
sudo bash deploy/install-firm.sh
```

You'll be asked, in order:

| Prompt | Notes |
|---|---|
| Edition | **1) Core** or **2) Enterprise** — matches your licence |
| Domain | your hostname, e.g. `studio.example.in` |
| TLS email | for the Let's Encrypt certificate |
| Postgres / session secrets | **Enter = auto-generate** (recommended) |
| MinIO user / password | default `esti-admin` / auto-generate |
| Owner email + password | **your admin login** |
| Product API key | the key Holagundi issued — **blank = activate later** |

~5–8 minutes later you're live at `https://<your-domain>`. Everything is written to
`/opt/esti/.env` (root-only, chmod 600).

### Non-interactive

```bash
EDITION=enterprise DOMAIN=studio.example.in \
  ADMIN_EMAIL=you@studio.in OWNER_EMAIL=you@studio.in OWNER_PASSWORD='…' \
  ESTI_PRODUCT_API_KEY='…' \
  sudo -E bash deploy/install-firm.sh
```
`EDITION` ∈ `core | enterprise`. Anything you don't pass is prompted; secrets left
unset auto-generate.

## 4. Licensing

- Your node points at `ESTI_LICENSE_API_URL=https://aorms.in/platform` (the default)
  and activates with `ESTI_PRODUCT_API_KEY`.
- **A blank key can't brick anything** — the app simply runs on its edition's plan
  (Core / Enterprise) *unmanaged* until a licence is activated.
- **Activate later:** edit `/opt/esti/.env` → set `ESTI_PRODUCT_API_KEY=…`, then
  `bash deploy/update.sh`.

## 5. Day-2 operations

```bash
cd /opt/esti
bash deploy/update.sh                       # pull latest + rebuild (profile remembered)
bash deploy/backup.sh /opt/esti/backups     # Postgres + MinIO backup (cron it daily)
docker compose -f compose.prod.yaml ps      # health
docker compose -f compose.prod.yaml logs -f backend
systemctl restart esti                      # restart the whole stack
```

**Optional — delegate login to the central platform** ("all users online"): opt-in,
default off. In `.env` set `ESTI_IDENTITY_DELEGATE=true` (and `ESTI_COMPANY=AORMS-C-…`
to enforce membership), then `bash deploy/update.sh`. Credentials then verify against
`aorms.in` with offline-grace fallback to the cached local password. Flip back to
`false` any time — no data change. See [AORMS-IDENTITY.md](AORMS-IDENTITY.md).

## 6. Notes

- No `/platform-admin` console is provisioned on a customer box — it's a firm
  workspace only. (Licensing/admin lives centrally at `aorms.in`.)
- Full operator reference (env keys, security posture, troubleshooting):
  [ADMIN-GUIDE.md](ADMIN-GUIDE.md) and [VPS-INSTALL.md](VPS-INSTALL.md).
