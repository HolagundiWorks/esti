# Org mode and Team / HR archive

How ESTI distinguishes **solo practice** from **studio (team)** operation in production,
and how demo workspaces are kept separate.

Related: [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md) · [PRD](PRD.md) · [ROADMAP](ROADMAP.md)

---

## Concepts (do not conflate)

| Concept | Storage | Purpose |
| -------- | ------- | ------- |
| **`orgSettings.orgMode`** | `SOLO` \| `STUDIO` | Operating mode — controls team module availability |
| **`orgSettings.hrEnabled`** | boolean | Team & HR module switch (nav, APIs, dashboard widgets) |
| **`firm.firmType`** | `SOLO` \| `PARTNERSHIP` | Legal / GST profile only — **does not** hide modules |
| **`esti_hr_archive`** | JSON snapshot rows | Immutable record when a studio downgrades to solo |

Solo and studio are **different operating modes**, not a cosmetic UI toggle on the same live data.

---

## Production rules

### 1. Choose mode at onboarding

New firms start as **`orgMode = SOLO`**, **`hrEnabled = false`**.

Enabling Team & HR sets **`orgMode = STUDIO`**, **`hrEnabled = true`**.

### 2. Simple disable (no archive)

Turning Team & HR **off** is allowed **only when no team-module records exist**:

- At most one active team member, **and**
- No attendance register entries, leaves, or reward points, **and**
- Project assignments involve at most one person

In that case ESTI maps open tasks to the principal and sets solo mode — no snapshot required.

### 3. Archive required (real studio downgrade)

If any lock condition is present, the owner **cannot** use the simple toggle. They must run **Archive Team & HR**:

1. **Pre-flight** — UI lists lock reasons (roster size, attendance, assignments, etc.).
2. **Confirm** — owner types `ARCHIVE TEAM`.
3. **Snapshot** — immutable JSON stored in `esti_hr_archive`:
   - team roster, project assignments, per-task assignee/reviewer attribution
   - counts of attendance, leaves, reward points
4. **Remap** — open tasks → principal architect; reviewers cleared.
5. **Deactivate** — non-principal team members set `active = false`.
6. **Mode** — `orgMode = SOLO`, `hrEnabled = false`.

Historical attendance, leaves, ASPRF points, and archived snapshots remain in the database for audit and future read-only reporting. They are not deleted.

### 4. Re-enabling studio mode

Turning Team & HR **back on**:

- Sets `orgMode = STUDIO`, `hrEnabled = true`.
- **Reactivates** team members listed in the **latest archive snapshot** (if any).
- **Does not** restore task assignees — those stay on the principal until manually reassigned.

This matches real practice: downsizing is deliberate; growing again means rebuilding live assignments, not silently undoing history.

---

## Lock reasons

| Code | Trigger |
| ---- | ------- |
| `MULTIPLE_TEAM_MEMBERS` | More than one active team member |
| `ATTENDANCE` | Any attendance register row |
| `LEAVES` | Any leave row |
| `REWARD_POINTS` | Any ASPRF reward point row |
| `MULTI_PERSON_ASSIGNMENTS` | Assignments across more than one team member |

API: `settings.hrModuleStatus` returns `locked`, `lockReasons`, counts, and recent archives.

---

## Demo workspaces (separate accounts)

Demo is **not** production mode switching.

| Seed | Login | Mode |
| ---- | ----- | ---- |
| `pnpm seed:demo` | `principal@demo.aorms.in` | STUDIO · HR on · 14 projects · full team |
| `pnpm seed:demo:solo` | `solo@demo.aorms.in` | SOLO · HR off · 3 projects · principal only |

Landing page: Solo persona → `solo@demo…`; Studio persona → `principal@demo…`.

Optional env: `VITE_SOLO_DEMO_URL`, `VITE_FULL_DEMO_URL` for external hosts.

The Company toggle on the **studio demo** still exercises the production archive workflow if you try to disable HR with team data present.

---

## HR time tracking (architecture firms)

Indian architecture studios track **daily attendance** (present / absent / WFH / half-day), not hourly project timesheets or agile stand-ups. ESTI reflects this:

| Removed from product | Replaced with |
| -------------------- | ------------- |
| Timesheets (`esti_timesheet`) | **Attendance register** (`esti_attendance`) |
| Stand-up / daily updates (`esti_daily_update`) | *(removed — use tasks + activity)* |

Legacy tables may remain in the database from older demos but are **not exposed** in the UI or API. ASPRF scores use tasks, decisions, and approvals only.

---

## API surface

| Procedure | Role | Behaviour |
| --------- | ---- | --------- |
| `attendance` | staff | daily register (`dayRegister`, `mark`, `markDay`) |
| `settings.get` | staff | org flags including `orgMode`, `hrEnabled` |
| `settings.hrModuleStatus` | staff | lock assessment + archive list |
| `settings.setHrEnabled` | owner | simple enable/disable (disable throws if locked) |
| `settings.archiveTeamModule` | owner | full archive workflow (`confirmPhrase: "ARCHIVE TEAM"`) |

All team-module write paths remain guarded by `requireHrEnabled`.

---

## Implementation map

| Layer | File(s) |
| ----- | ------- |
| Org mode + archive schema | `backend/drizzle/0034_org_mode_hr_archive.sql`, `backend/src/db/schema/org-auth.ts` |
| Lock / snapshot / archive | `backend/src/lib/hrMode.ts` |
| Settings API | `backend/src/modules/settings/router.ts` |
| Shared types | `packages/contracts/src/org-mode.ts` |
| Company UI + archive modal | `frontend/src/routes/Company.tsx` |
| Attendance API + UI | `backend/src/modules/attendance/router.ts`, `frontend/src/components/work/AttendanceTab.tsx` |
| Demo seeds | `backend/src/scripts/seedDemo.ts`, `seedDemoSolo.ts` |
| Landing personas | `frontend/src/routes/Landing.tsx` |

---

## Future work

- [ ] Read-only **HR archive viewer** (browse snapshot roster + attribution without mutating live data)
- [ ] **Export bundle** (JSON/PDF) at archive time for offline retention
- [ ] **Onboarding wizard** — explicit solo vs studio choice on first owner login (production signup)
- [ ] Block `setHrEnabled` entirely on non-demo tenants until onboarding complete

---

## Operations

```sh
# Studio demo
podman exec esti-backend sh -c "cd /app/backend && pnpm db:migrate && pnpm seed:demo"

# Solo demo (same DB — separate user)
podman exec esti-backend sh -c "cd /app/backend && pnpm seed:demo:solo"
```

Password: `SEED_DEMO_PASSWORD` or default `demo1234`.
