# Demo workspace and Team mode

Quick reference for demo logins and how they relate to production org mode.

**Full design:** [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md)

---

## Demo logins

| Persona | Seed | Login | Password |
| ------- | ---- | ----- | -------- |
| **Team practice** | `pnpm seed:demo` | `principal@demo.aorms.in` | `demo1234` |

Demo workspaces mirror live upload behaviour. File uploads require the **upload password** (same as the demo login password unless `SEED_DEMO_PASSWORD` was changed). Owners can toggle this gate under **Company → Upload protection** on live firms too.

After seed, open any project → **Project Info** tab (§9 Compliance) for pre-construction envelope and post-construction audit (Sharma Villa and Verde Block have sample audits).

**Showcase paths (investor tour):**

| Area | Where to look |
| --- | --- |
| Drawings + takeoff | **Sharma Villa** or **Verde Commercial Block** → Drawings tab — linked GFC plan, ESTICAD-synced quantities, **Open in ESTICAD** |
| CRIF + comments | **Sharma / Verde / Patel HQ** → Overview or Decisions — threaded decision comments |
| Client portal | `client@demo.aorms.in` — Kapoor Residence |

Re-run `seed:demo` on an existing workspace to **backfill** missing records (idempotent). Legacy browser takeoff rows (`source: WEB`) are purged on each run.

**Intentionally not seeded** (charter / scope): tenders, contractor bids, document register bulk, AI Studio draft runs, device sessions — add only when a module needs a dedicated demo pilot. PMC contractor RFIs/NCRs are seeded on showcase projects via `seedDemoPmc.ts`.

**Container workflow:**

```bash
podman compose up -d --build
podman exec esti-backend sh -c "cd /app/esti/backend && pnpm db:migrate && pnpm seed:demo"
```

**Production (VPS / Docker):**

```bash
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:prod
```

Staff personas on team demo: `lead@`, `site@`, `junior@`, `intern@`, `client@demo.aorms.in`.

Landing page opens the team demo login.

---

## Production vs demo

| | Demo | Production |
| --- | --- | --- |
| Operating mode | Team mode only | Team mode only |
| Team / HR | Enabled | Enabled |

Team mode includes team nav, workload, attendance, dashboard team widgets, and team API writes.

---

## See also

- [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md) — lock rules, snapshot schema, API
- [ROADMAP.md](ROADMAP.md) — delivery status
