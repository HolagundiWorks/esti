# Demo workspace and Team mode

Quick reference for demo logins and how they relate to production org mode.

**Full design:** [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md)  
**Item inventory (Studio Intelligence tuned):** [DEMO-SEED-ITEMS.md](DEMO-SEED-ITEMS.md)

---

## Demo logins

| Persona | Seed | Login | Password |
| ------- | ---- | ----- | -------- |
| **Principal** | `pnpm seed:demo` | `principal@demo.aorms.in` | `demo1234` |
| Design lead | same seed | `lead@demo.aorms.in` | same |
| Site architect | same seed | `site@demo.aorms.in` | same |
| Junior architect | same seed | `junior@demo.aorms.in` | same |
| Studio manager | same seed | `accounts@demo.aorms.in` | same |

Demo workspaces mirror live upload behaviour. File uploads require the **upload password** (same as the demo login password unless `SEED_DEMO_PASSWORD` was changed). Owners can toggle this gate under **Company → Upload protection** on live firms too.

**Studio Intelligence tour** — log in as principal and open `/`:

| Surface | What to check |
| ------- | ------------- |
| Rail — Today | Open tasks · meeting today (MOM) · site visit today |
| Stage — Zone health | Client / Finance / Projects / Team orbs (not all green) |
| Stage — KPIs | Pipeline · Outstanding (overdue) · Collected · Ready to bill |
| Priorities tab | Overdue invoices · stale approvals · billing-ready phases |
| Projects tab | Sharma Villa + Verde Block at risk |
| Team tab | Five assignees with mixed capacity |

**Showcase projects:**

| Area | Where to look |
| --- | --- |
| Drawings + takeoff | **Sharma Villa** or **Verde Commercial Block** → Drawings tab |
| CRIF + comments | **Sharma / Verde / Patel HQ** → Overview or Decisions |
| Leads pipeline | `/office/leads` — 10 enquiries across statuses |
| Client portal | `client@demo.aorms.in` — Kapoor Residence |

Re-run `seed:demo` on an existing workspace to **backfill** studio glance data (team, leads, MOMs, visits — idempotent). Use `SEED_DEMO_FORCE=1` to wipe and rebuild billing links.

**Intentionally not seeded** (charter / scope): document register bulk, AI Studio draft runs, device sessions — add only when a module needs a dedicated demo pilot.

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

- [DEMO-SEED-ITEMS.md](DEMO-SEED-ITEMS.md) — full seeded entity list
- [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md) — lock rules, snapshot schema, API
- [ROADMAP.md](ROADMAP.md) — delivery status
