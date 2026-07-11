# AORMS-Studio workspace UI — Autopilot roadmap

> **Agent queue** for rolling the **Glass Rail** design (canonical on Studio
> Intelligence, `/`) across every authenticated workspace screen. Visual spec:
> [HCW-UI-KIT.md § Glass Rail](HCW-UI-KIT.md#glass-rail--canonical-reference-studio-intelligence).
>
> **Human sign-off (2026-07-09):** Studio Intelligence rail UI is **complete** —
> agents may clone its geometry, scroll model, and section vocabulary onto other
> screens without re-opening layout decisions.

**Status markers:** ✅ Done · 🔄 In progress · ⬜ Queued · 🚧 Human-led · ⛔ Blocked (parallel WIP)

---

## How to read this

| Column | Meaning |
|--------|---------|
| **Pri** | P0 = shell primitive blocks all screens · P1 = high-traffic screens · P2 = polish / kit export |
| **Owner** | `autopilot` = agent can run end-to-end · `human` = design/UX gate |
| **Verify** | Command or manual check that closes the task |

**Autopilot rules**

1. **Clone Studio Intelligence** — do not invent a second rail recipe. Reuse
   `.esti-dash-rail` / `.esti-dash-stage`, the fixed `100vh` rail + independent
   stage scroll, glass panel SCSS, hairline section dividers, and overline labels.
2. **Rail holds instruments; stage holds work.** Filters, tabs, telemetry, identity,
   and **auth panels** live in the rail. Tables, grids, editors, and primary content
   live in the stage.
3. **Login is rail-first** — the sign-in / tenant-picker panel is **never** centred
   on the stage (see [U2](#u2--login--auth-rail)).
4. No new raw hex in screens — tokens from `@hcw/ui-kit` + documented `glass.scss`
   exceptions only.
5. Update this file when a task ships (status + date in commit message body).
6. **Do not edit** `Projects.tsx` or `Clients.tsx` unless the human removes the
   parallel-WIP flag in `CLAUDE.md`.

---

## Status at a glance

| Phase | Focus | Pri | Status | Owner |
|-------|--------|-----|--------|-------|
| [U0](#u0--glass-rail-reference-studio-intelligence) | Glass rail reference (Studio Intelligence) | P0 | ✅ | human |
| [U1](#u1--shared-shell-primitives) | Shared shell primitives (`RailLayout`, SCSS) | P0 | ✅ | autopilot |
| [U2](#u2--login--auth-rail) | Login & auth → rail | P0 | ✅ | autopilot |
| [U3](#u3--rail-layout-screens-batch-rollout) | `RailLayout` screen rollout | P1 | ✅ | autopilot |
| [U4](#u4--stage-head--health-orbs) | Stage-head zone health + glass orbs | P1 | ✅ | autopilot |
| [U5](#u5--portals--estimate) | Client/consultant portals + Estimate app | P2 | ✅ | autopilot |
| [U6](#u6--hcw-ui-kit-export) | Promote primitives to `@hcw/ui-kit` | P2 | ✅ | autopilot |

---

## U0 — Glass rail reference (Studio Intelligence)

**Goal:** One screen proves the full Rail · Stage · Footer · Dock model with glass rail.

| # | Task | Status | Reference |
|---|------|--------|-----------|
| U0.1 | Glass rail panel — full viewport height, fixed left, internal scroll | ✅ | `glass.scss` `.esti-app-shell2--studio-home .esti-dash-rail` |
| U0.2 | Stage scrolls independently; page shell does not scroll (desktop) | ✅ | `glass.scss` `.esti-dash-stage` + `esti-app-content2` overflow |
| U0.3 | Rail content stack — greeting · attention · Today · office health · due dates · toggles (`mt: auto`) | ✅ | `StudioAbstract.tsx` rail `Box` |
| U0.4 | Stage head — zone health row (top divider, heading left, 26px orbs, label beside dot) | ✅ | `StudioAbstract.tsx` `esti-dash-stage-head` |
| U0.5 | Glass taskbar footer — calculator LEFT · launchers CENTRE · tray RIGHT | ✅ | `AppFooterBar.tsx` |
| U0.6 | Float ribbon nav (admin menu) — top-right, rail/stage `padding-top: 40px` | ✅ | `AppRibbon.tsx` `variant="float"` |

**Verify:** Open `/` at ≥901px width — rail is full-height glass panel; only stage scrolls;
footer launchers centred; zone health row matches spec in HCW-UI-KIT.

---

## U1 — Shared shell primitives

**Goal:** `RailLayout` and global SCSS match Studio Intelligence so every screen gets
the glass rail without copy-pasting layout math.

| # | Task | Status | Notes |
|---|------|--------|-------|
| U1.1 | Promote glass rail SCSS from studio-home scope → `.esti-dash-rail--glass` (or default on all rails) | ✅ | 2026-07-10 — `.esti-glass-dash .esti-dash-rail` is global |
| U1.2 | `RailLayout` — fixed `100vh` rail + width spacer pattern (desktop) | ✅ | Spacer + fixed rail in `RailLayout.tsx` + `glass.scss` |
| U1.3 | `RailLayout` — stage `overflow-y: auto`, shell `overflow: hidden` | ✅ | |
| U1.4 | `RailLayout` — replace orange left-bar title with rail greeting stack (optional `title` prop keeps h4) | ✅ | 2026-07-10 — overline “Workspace” + h5 title |
| U1.5 | `RailLayout` — vertical tabs left-aligned (already in SCSS) | ✅ | `.esti-dash-rail .MuiTab-root` |
| U1.6 | Mobile — rail stacks first, static position, full width | ✅ | `glass.scss` `@media (max-width: 900px)` |

**Verify:** Any screen using `RailLayout` shows glass rail at full viewport height on
desktop without editing the screen file.

**Gate:** U1 complete before batch U3.

---

## U2 — Login & auth rail

**Goal:** Unauthenticated auth surfaces use the same Rail · Stage split. **The login
panel sits in the rail, not on the stage.**

| Surface | Rail (20%) | Stage (80%) |
|---------|------------|-------------|
| `/login` | Brand · welcome copy · email/password · Google · tenant picker · links | Editorial canvas — product visual, edition tagline, or calm empty Fog Gray (no form) |
| `/signup` | Registration form | Same stage treatment |
| `/forgot-password` · `/reset-password` | Recovery form | Stage canvas |
| `/recover` (backup code) | Code entry | Stage canvas |
| Force-password change | New-password form | Stage canvas |
| Platform admin login | Admin credentials | Stage canvas |

| # | Task | Status | Notes |
|---|------|--------|-------|
| U2.1 | Replace centred `esti-login-shell` grid with `esti-glass-dash` rail/stage split | ✅ | `AuthRailLayout` + `Login.tsx` (2026-07-10) |
| U2.2 | Move `esti-login-panel` content into `.esti-dash-rail` (glass) | ✅ | Form fields, alerts, tenant step in rail |
| U2.3 | Stage — hero / brand moment (reuse landing asset or minimal mark) | ✅ | `AuthStageCanvas` |
| U2.4 | Roll same shell to `Signup`, `ForgotPassword`, `ResetPassword`, `RecoverWithBackupCode`, `ForcePasswordChange`, `ExternalLogin` | ✅ | All use `AuthRailLayout` |
| U2.5 | Platform admin `platform-admin/Login.tsx` | ✅ | Same rail rule |
| U2.6 | Retire `max-width: 24rem` centred panel — rail width is 20% viewport | ✅ | Auth uses rail; legacy `.esti-login-panel` unused by auth routes |

**Verify:** `/login` — form is inside left glass rail; resizing does not centre the form
on the page; stage has no email/password fields.

**Owner:** autopilot after U1.1–U1.2 land (needs glass rail primitive).

---

## U3 — `RailLayout` screen rollout

**Goal:** Every workspace screen that already uses `RailLayout` adopts the U1 glass
rail shell. **Content migration only** — tabs/aside/children stay, chrome upgrades.

Roll in pillar order (each batch = one PR / agent run):

### Batch A — Studio & tasks (P1)

| Screen | File | Status |
|--------|------|--------|
| Tasks hub | `Work.tsx` | ✅ | Uses `RailLayout` (U1 glass) |
| Alerts | `Alerts.tsx` | ✅ | Uses `RailLayout` |
| Performance | `Performance.tsx` | ✅ | Uses `RailLayout` |
| Team | `Team.tsx` | ✅ | Uses `RailLayout` |
| HR | `Hr.tsx` | ✅ | Uses `RailLayout` |
| Profile | `Profile.tsx` | ✅ | Portal / account surfaces |
| Settings | `Settings.tsx` | ✅ | Redirects to `/account#settings` |

### Batch B — Projects & third parties (P1)

| Screen | File | Status |
|--------|------|--------|
| Project detail | `ProjectDetail.tsx` | ✅ | `RailLayout` + breadcrumbs + collapsed IA |
| Archived projects | `ArchivedProjects.tsx` | ✅ | Uses `RailLayout` |
| Leads | `Leads.tsx` | ✅ | Uses `RailLayout` |
| Consultants | `Consultants.tsx` | ✅ | Uses `RailLayout` |
| Contractors | `Contractors.tsx` | ✅ | Uses `RailLayout` |
| Vendors | `Vendors.tsx` | ✅ | Uses `RailLayout` |
| Active projects | `Projects.tsx` | ✅ | `RailLayout` (WIP flag: avoid unrelated edits) |
| Clients | `Clients.tsx` | ✅ | `RailLayout` (WIP flag: avoid unrelated edits) |

### Batch C — Office & finance (P1)

| Screen | File | Status |
|--------|------|--------|
| Proposals | `Proposals.tsx` | ✅ | Breadcrumb + dock clear on dialog |
| Letters | `Letters.tsx` | ✅ | Breadcrumb + dock clear on dialog |
| Contracts | `Contracts.tsx` | ✅ | Breadcrumb + dock clear on dialog |
| Documents register | `DocumentsRegister.tsx` | ✅ | Breadcrumb + dock clear on tpl dialog |
| Office expenses / cash book | `OfficeExpenses.tsx` | ✅ | Both layouts breadcrumbed; dock clear |
| Invoices | `Invoices.tsx` | ✅ | Breadcrumb + dock clear on dialog |
| Payroll | `Payroll.tsx` | ✅ | Breadcrumb + dock clear on dialog |
| Reconcile | `Reconcile.tsx` | ✅ | Breadcrumb |
| Filing | `Filing.tsx` | ✅ | Breadcrumb |

### Batch D — Library & admin (P2)

| Screen | File | Status |
|--------|------|--------|
| Knowledge bank | `KnowledgeBank.tsx` | ✅ | Redirects → spec-catalog |
| Compliance library | `ComplianceLibrary.tsx` | ✅ | Breadcrumb |
| Master plan library | `MasterPlanLibrary.tsx` | ✅ | Breadcrumb |
| Standards library | `StandardsLibrary.tsx` | ✅ | Breadcrumb + dock clear |
| Company | `Company.tsx` | ✅ | Redirects → company-account |
| Users | `Users.tsx` | ✅ | Redirects → company-account#members |
| Audit log | `AuditLog.tsx` | ✅ | Redirects → company-account#administration |
| System admin | `SystemAdmin.tsx` | ✅ | Breadcrumb + RailLayout |
| LXOS placeholder | `Lxos.tsx` | ✅ | Breadcrumb + Coming soon |

**Per-screen checklist (autopilot):**

- [ ] Screen uses upgraded `RailLayout` (U1) — no local rail geometry
- [ ] Rail: title/description/tabs/aside only — no DataGrid in rail
- [ ] Stage: primary table/editor content; scrolls independently
- [ ] Page-level CTAs via `useScreenActions` (not `RailLayout actions=`)
- [ ] `pnpm exec tsc -p tsconfig.json --noEmit` clean in `esti-frontend` container

---

## U4 — Stage-head & health orbs

**Goal:** Screens that surface zone/office health use the same stage-head row and glass
orbs as Studio Intelligence. Cross-ref: archived [ESTIMATE-AUTOPILOT-ROADMAP.md](../archive/esti/ESTIMATE-AUTOPILOT-ROADMAP.md#e8--glass-health-orbs-workspace-ui).

| # | Task | Status |
|---|------|--------|
| U4.1 | Studio Intelligence stage zone health (26px orb, label beside dot, heading left) | ✅ |
| U4.2 | Studio Intelligence rail office health row | ✅ |
| U4.3 | Taskbar footer office health → `OfficeHealthGlyph` glass | ✅ | `AppFooterBar` already glass |
| U4.4 | Dense tables → `OfficeHealthGlyph` `variant="glass"` size 12 | ✅ | Studio Top risks glass; StatusDot kept for non-zone tags |
| U4.5 | Optional `@hcw/ui-kit` `HealthGlassOrb` export | ✅ | Kit export; `OfficeHealthGlyph` wraps it |

---

## U5 — Portals & Estimate

| # | Surface | Status | Notes |
|---|---------|--------|-------|
| U5.1 | Client portal `Portal.tsx` | ✅ | `ExternalPortalShell` → kit `GlassRail` |
| U5.2 | Consultant portal `CollaboratorPortal.tsx` | ✅ | Same shell |
| U5.3 | Estimate app `estimate/` | ✅ N/A | No `estimate/` tree in monorepo; archived [ESTIMATE-AUTOPILOT-ROADMAP.md](../archive/esti/ESTIMATE-AUTOPILOT-ROADMAP.md). Site portal also on `ExternalPortalShell`. |

**CMS / Estimation orphan:** `/estimation*` redirects to projects/measurement. `components/cms/` is not wired as project tabs — see [NAVIGATION.md](NAVIGATION.md).

---

## U6 — HCW-UI-Kit export

**Goal:** Move stable shell primitives from `frontend/src/glass.scss` into
`packages/hcw-ui-kit` so portals import one package.

| # | Primitive | Status |
|---|-----------|--------|
| U6.1 | `GlassRail` / rail stage layout component | ✅ | `packages/hcw-ui-kit/src/GlassRail.tsx` |
| U6.2 | `HealthGlassOrb` (`OfficeHealthGlyph` glass variant) | ✅ | Kit + thin app wrapper |
| U6.3 | `TaskbarFooter` parity with `AppFooterBar` launcher layout | ✅ | `left` · `center` · `right` slots; workspace keeps `AppFooterBar` composition |
| U6.4 | Document `glass.scss` shrink — app keeps studio pulse + exceptions only | ✅ | See [HCW-UI-KIT.md](HCW-UI-KIT.md) + header comment in `glass.scss` |
| U6.5 | Clear / heading glass tokens + marketing hierarchy in kit | ✅ | `CLEAR_GLASS_SURFACE`, `HEADING_GLASS_SURFACE`; `GlassRail glass="clear"`; docs + README |

**Gate:** U0–U6 closed for workspace + external portals + marketing hierarchy (2026-07-10).

---

## Autopilot execution order

```
U0 ✅ ──► U1 shell primitives ──gate──► U2 login rail
                │
                ├─► U3 batches A→D (RailLayout screens)
                ├─► U4 health orbs (parallel with U3)
                └─► U5 portals + estimate
                          │
                          └─► U6 kit export
```

---

## Key files

| Area | Path |
|------|------|
| Canonical rail UI | `frontend/src/routes/StudioAbstract.tsx` |
| Shared layout | `frontend/src/components/RailLayout.tsx` |
| Glass rail SCSS | `frontend/src/glass.scss` (`.esti-dash-rail`, `.esti-app-shell2--studio-home`) |
| Taskbar footer | `frontend/src/components/shell/AppFooterBar.tsx` |
| Health glyph | `frontend/src/components/shell/OfficeHealthGlyph.tsx` |
| Login (to migrate) | `frontend/src/routes/Login.tsx` · `styles.scss` `.esti-login-*` |
| Design spec | [HCW-UI-KIT.md](HCW-UI-KIT.md) |
| Estimate UI queue | [../archive/esti/ESTIMATE-AUTOPILOT-ROADMAP.md](../archive/esti/ESTIMATE-AUTOPILOT-ROADMAP.md) (archived) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Roadmap created. U0 marked complete (Studio Intelligence glass rail). U2 locks login panel to rail. U3 lists all `RailLayout` screens in rollout batches. |
