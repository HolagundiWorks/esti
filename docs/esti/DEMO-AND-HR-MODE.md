# Demo workspace and Team / HR mode

Quick reference for demo logins and how they relate to production org mode.

**Full design:** [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md)

---

## Demo logins (separate workspaces)

| Persona | Seed | Login | Password |
| ------- | ---- | ----- | -------- |
| **Studio** | `pnpm seed:demo` | `principal@demo.aorms.in` | `demo1234` |
| **Solo** | `pnpm seed:demo:solo` | `solo@demo.aorms.in` | `demo1234` |

After seed, open any studio project → **Compliance** tab for pre-construction envelope and post-construction audit (Sharma Villa and Verde Block have sample audits).

**Showcase paths (investor tour):**

| Area | Where to look |
| --- | --- |
| Drawings + takeoff | **Sharma Villa** or **Verde Commercial Block** → Drawings tab — linked GFC plan, ESTICAD-synced quantities, **Open in ESTICAD** |
| Estimation | **Sharma Villa** → Estimates tab — draft BOQ linked to Master DSR |
| CRIF + comments | **Sharma / Verde / Patel HQ** → Overview or Decisions — threaded decision comments |
| Client portal | `client@demo.aorms.in` — Kapoor Residence |
| Solo practice | `solo@demo.aorms.in` — 3 projects, HR off, one linked drawing with takeoff |

Re-run `seed:demo` on an existing workspace to **backfill** missing records (idempotent). Legacy browser takeoff rows (`source: WEB`) are purged on each run.

**Intentionally not seeded** (charter / scope): tenders, contractor bids, construction RFI inbox, document register bulk, AI Studio draft runs, device sessions — add only when a module needs a dedicated demo pilot.

**Container workflow:**

```bash
podman compose up -d --build
podman exec esti-backend sh -c "cd /app/backend && pnpm db:migrate && pnpm seed:demo"
podman exec esti-backend sh -c "cd /app/backend && pnpm seed:demo:solo"
```

**Production (VPS / Docker):**

```bash
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:solo:prod
```

Solo seed source: `backend/src/scripts/seedDemoSolo.ts` — login `solo@demo.aorms.in`, password `demo1234` (or `SEED_DEMO_PASSWORD`).

Staff personas on studio demo: `lead@`, `site@`, `junior@`, `intern@`, `client@demo.aorms.in`.

Landing page opens the matching login per audience card. Optional: `VITE_SOLO_DEMO_URL`, `VITE_FULL_DEMO_URL`.

---

## Production vs demo

| | Demo | Production |
| --- | --- | --- |
| Solo vs studio | Two seeded accounts | `orgMode` + `hrEnabled` on your firm |
| Disable team with data | Archive modal on studio demo | Same archive workflow (`settings.archiveTeamModule`) |
| Casual toggle | Exercises real rules on studio demo | Simple disable only when no team records |

Do **not** treat the Company toggle as a reversible “preview” on a live studio — use the archive workflow when lock reasons apply.

---

## What solo mode hides

When `hrEnabled = false`: Team, HR, Performance nav; Workload, Attendance tabs; dashboard team widgets; team API writes (see ORG-MODE doc for full list).

Tasks remain; assignee resolves to the principal architect.

---

## See also

- [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md) — lock rules, snapshot schema, API
- [ROADMAP.md](ROADMAP.md) — delivery status
