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

**Container workflow:**

```bash
podman compose up -d --build
podman exec esti-backend sh -c "cd /app/backend && pnpm db:migrate && pnpm seed:demo"
```

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
