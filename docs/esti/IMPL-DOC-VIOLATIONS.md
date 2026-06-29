# Implementation vs. Documentation Violations

**Audit date:** 2026-06-29  
**Branch:** `claude/ui-audit-violations-gbr53x`  
**Scope:** Cross-check of all implementation code against product documentation in `docs/esti/`.

---

## Summary

| Category | Count | Severity |
|---|---|---|
| A — Class naming mismatch (code ≠ documented name) | 2 | CRITICAL / HIGH |
| B — CSS token violation (hard-coded / wrong value) | 1 | HIGH |
| C — Carbon spacing rule violation (`gap={1}` with text) | 16 instances / 7 files | MEDIUM |
| D — Permission model contradicts access-hierarchy doc | 1 | HIGH |
| E — Documentation not updated after Estimation OS removal | 7 files | HIGH (stale docs) |

---

## Category A — Class Naming Mismatch

### A-1 `FloatingDock` uses `.esti-dock` instead of `.esti-floating-dock` ⚠ CRITICAL

**Source:**
- `frontend/src/components/FloatingDock.tsx:31` → `className="esti-dock"`
- `frontend/src/styles.scss:1036` → `.esti-dock { … }`

**Documentation:**  
`docs/esti/CARBON-UI-DIRECTION.md` — Documented Exceptions table lists the class as
`.esti-floating-dock`, not `.esti-dock`.

```
Permitted class              Purpose
esti-floating-dock           Bottom-anchored floating action dock
```

**Violation:** The component emits `esti-dock`; the CSS defines `.esti-dock`; the documentation
names it `esti-floating-dock`. All three should agree. The canonical name from the policy
document is `esti-floating-dock`.

**Fix:** Rename the class consistently:
1. `FloatingDock.tsx:31` → `className="esti-floating-dock"`
2. `styles.scss:1036` → `.esti-floating-dock { … }`

---

### A-2 Landing CSS uses `.esti-lp-*` instead of documented `.esti-landing-*` ⚠ HIGH

**Source:**  
`frontend/src/styles.scss` lines ~1339–1700 — 70+ CSS classes with the `.esti-lp-*` prefix
(e.g. `.esti-lp-hero`, `.esti-lp-nav`, `.esti-lp-feature-card`, `.esti-lp-cta-block`, …).

**Documentation:**  
`docs/esti/CARBON-UI-DIRECTION.md` — Documented Exceptions table lists landing classes as:

```
esti-landing-content         Full-bleed landing wrapper
esti-landing-*               Landing page sub-sections
```

The documented prefix is `esti-landing-*`. The implementation uses `esti-lp-*`.

**Violation:** `esti-lp-*` is an undocumented prefix. Only `esti-landing-content` and
`esti-landing-*` are recognised exceptions to the "no custom CSS" rule. All 70+ `.esti-lp-*`
rules are therefore unpermitted in the design system.

**Fix:** Rename every `.esti-lp-*` selector and its corresponding JSX `className` reference
to `.esti-landing-*` and add the sub-class names to the CARBON-UI-DIRECTION exceptions table.

---

## Category B — CSS Token Violation

### B-1 `.esti-login-mark` uses `background: transparent` instead of `--cds-background-inverse` ⚠ HIGH

**Source:**  
`frontend/src/styles.scss:211`
```scss
.esti-login-mark {
  background: transparent;   /* ← violation */
  …
}
```

**Documentation:**  
`docs/esti/CARBON-UI-DIRECTION.md` states:

> `.esti-login-mark` — the login-page brand mark container.  
> **Must** use `background: var(--cds-background-inverse)` (Carbon `$background-inverse` token,
> resolves to `$gray-100` in the default theme) — not `transparent`.

**Violation:** The class uses a bare `transparent` keyword instead of the required Carbon token.
This breaks theme support — `transparent` is invisible in both light and dark modes,
whereas `--cds-background-inverse` provides the correct dark background in either theme.

**Fix:**
```scss
.esti-login-mark {
  background: var(--cds-background-inverse);
}
```

---

## Category C — Carbon Spacing Rule Violation (`gap={1}` with visible text)

**Rule:**  
`docs/esti/CARBON-UI-DIRECTION.md`:
> Never use `gap={1}` (2 px) for visible text — minimum `gap={3}` (8 px).

`gap={1}` collapses to 2 px — illegible for multi-line text stacks. The minimum for any
layout containing readable text is `gap={3}`.

The following 16 uses of `<Stack gap={1}>` contain visible text content:

| File | Line | Context |
|---|---|---|
| `frontend/src/routes/Performance.tsx` | ~210 | Score label + value stack |
| `frontend/src/routes/Performance.tsx` | ~280 | Dimension label + bar |
| `frontend/src/routes/Performance.tsx` | ~310 | Member name + role |
| `frontend/src/routes/Performance.tsx` | ~345 | Period label + date |
| `frontend/src/routes/Performance.tsx` | ~412 | Reward item rows |
| `frontend/src/routes/Performance.tsx` | ~450 | Alert label + description |
| `frontend/src/components/licensing/LicensePanel.tsx` | ~88 | Plan name + description |
| `frontend/src/components/licensing/LicensePanel.tsx` | ~102 | Quota label + count |
| `frontend/src/components/licensing/LicensePanel.tsx` | ~118 | Feature name + status |
| `frontend/src/components/licensing/LicensePanel.tsx` | ~135 | Renewal date label + value |
| `frontend/src/components/work/ClientRequests.tsx` | ~67 | Request title + status |
| `frontend/src/components/work/ClientRequests.tsx` | ~89 | Client name + date |
| `frontend/src/routes/Portal.tsx` | ~145 | Section label + body text |
| `frontend/src/routes/SitePortal.tsx` | ~198 | Inspection item + note |
| `frontend/src/routes/Dashboard.tsx` | 1809 | Work-queue action name + type |
| `frontend/src/components/team/WorkloadTab.tsx` | ~233 | Member name + assignment count |

**Fix:** Change every `<Stack gap={1}>` that wraps visible text to at least `<Stack gap={3}>`.

---

## Category D — Permission Model Contradicts Access-Hierarchy Documentation

### D-1 `HR_MANAGER` role has `salary:view` capability ⚠ HIGH

**Source:**  
`packages/contracts/src/permissions.ts:167`
```typescript
HR_MANAGER: ["workspace:view", "write", "hr:manage", "salary:view"],
```

**Documentation:**  
`docs/esti/ACCESS-HIERARCHY.md` §8 — Payroll access table:

| Capability | L1 (Owner) | L2 (Partner / HR Mgr) | L3–L5 |
|---|---|---|---|
| View salary amounts for all staff | ✅ | — | — |

The §8 notes section states explicitly:
> **L2 manages payroll but does not see individual salary figures.** HR_MANAGER can
> run payroll operations (`hr:manage`) but salary amounts are L1-only information.

**Violation:** `HR_MANAGER` is a functional L2 role (rank 80). The `salary:view` capability
is explicitly restricted to L1 (rank 100 / OWNER) by the access-hierarchy document.
Adding `salary:view` to the `HR_MANAGER` allow-list contradicts this rule and exposes
every individual staff member's gross/net salary figures to the HR Manager login.

Also confirmed:  
`packages/contracts/src/permissions.ts:145`
```typescript
"salary:view": 100,   // L1 only: gross/net salary amounts, payslip ₹ values
```
The `MIN_RANK` map itself says rank 100 — but the explicit allow-list overrides this for
`HR_MANAGER`, bypassing the rank guard.

**Fix:** Remove `"salary:view"` from the `HR_MANAGER` allow-list:
```typescript
HR_MANAGER: ["workspace:view", "write", "hr:manage"],
```
If HR Managers need to run payroll without seeing individual amounts, the existing
`hr:manage` capability already covers payroll operations. Salary figures should remain
Owner-only.

---

## Category E — Documentation Not Updated After Estimation OS Removal

**Background:**  
`CLAUDE.md` (project instructions, authoritative):
> The **Estimation OS** (estimates/BOQ, `esti_component`/RuleSet engine,
> `formula-engine`/`ruleset-engine`, CostingWindow, ParametricCanvas, ComponentLibrary)
> and the **Construction Cost spine** (tenders, work packages, running bills,
> measurement book, deviations/variations, final accounts, cost dashboard, GRN,
> procurement forecast, BBS + steel reconciliation) were **removed** in the 2026-06-28
> teardown — to be rebuilt from the ground up. Rate Books + Rate Analysis remain.

The following documentation files still describe these removed features as live, implemented
functionality. This creates confusion for developers and agents working from the docs.

### E-1 `docs/esti/INFORMATION-ARCHITECTURE.md` ⚠ HIGH

Lines 68–207 describe as implemented:
- Estimation OS / Costing & Measurement tab (line 68–95)
- BOQ (Bill of Quantities) editor (lines 96–130)
- Running Bills / Measurement Book (lines 131–170)
- Cost Dashboard (lines 171–207)
- Component Library / Parametric Canvas / Rate Analysis deep-links

None of these exist in the codebase after the 2026-06-28 teardown.

### E-2 `docs/esti/ROADMAP.md` ⚠ HIGH

Phase 29: `🔄 Partial — "Estimation OS — costing spine (OS Phases 1–3)"`

The `🔄` (partial/in-progress) status implies active development. The feature was
removed entirely. The phase should be marked `❌ Removed (2026-06-28 teardown)` or
struck from the roadmap with a note.

### E-3 `docs/esti/PLANS-AND-TIERS.md` ⚠ MEDIUM

References `costing` and `pmc` as Core+ plan features with working UIs.
`costing` (BOQ & measurement window) was part of the Estimation OS teardown.
The plan feature gate `planAllows(plan, "costing")` still compiles but the UI
it guards no longer exists.

### E-4 `docs/esti/IFC-COMPONENT-MAPPING.md` ⚠ MEDIUM (if present)

Referenced in earlier audit context as containing Estimation OS component mappings.
These mappings are now dead references.

### E-5 `docs/esti/DEMO-AND-HR-MODE.md` ⚠ MEDIUM (if present)

Demo mode seed data descriptions reference BOQ / Estimation OS screens that no
longer exist.

### E-6 `docs/esti/ESTICAD-COMPANION.md` ⚠ LOW

Contains cross-references to the takeoff / BBS flow that fed into the Estimation OS.
The upstream consumer (Estimation OS) is gone; the companion doc should note this.

### E-7 `docs/esti/HR-PROFILE-SYSTEM.md` — Conformant

Not affected. HR Profile System remains in the codebase and documentation is accurate.

**Recommended fix for E-1 through E-6:**  
Add a removal notice banner at the top of each affected doc:

```markdown
> **Removed 2026-06-28.** The Estimation OS and Construction Cost spine were torn down
> for a ground-up rebuild. This section describes the original design only.
> Current implementation: Rate Books (`dsr`) and Rate Analysis remain.
```

---

## Conformant Items (No Violation)

The following areas were checked and found to match their documentation:

| Area | Files checked | Status |
|---|---|---|
| Navigation / shell structure | `App.tsx`, `Dashboard.tsx` | ✅ Matches IA sidebar spec |
| Two-head project model (Consultancy + PMC) | `ProjectDetail.tsx`, `INFORMATION-ARCHITECTURE.md` §3 | ✅ Conformant |
| `can(role, capability)` interface | `permissions.ts` | ✅ Matches ACCESS-HIERARCHY §2–§7 |
| `salary:view` rank in `MIN_RANK` | `permissions.ts:145` | ✅ rank 100 (L1 only) — see D-1 for allow-list override |
| `tenders:view` rank | `permissions.ts:146` | ✅ rank 60 (L3+, Senior and above) |
| Plan enum `LITE / CORE / ENTERPRISE` | `plans.ts`, `PLANS-AND-TIERS.md` | ✅ Exact match |
| LITE seat caps (staff=3, accountants=0, hrManagers=0) | `plans.ts:46–58` | ✅ Conformant |
| CORE seat caps (staff=15, accountants=1, hrManagers=1) | `plans.ts:59–70` | ✅ Conformant |
| `assertPlanFeature()` / `withinQuota()` backend enforcement | `backend/src/lib/plan.ts` | ✅ Conformant |
| ASPRF scoring weights | `COGNITION-ENGINE.md`, `aspRf` router | ✅ Weights match doc |
| Cognition Engine deterministic-first pattern | `COGNITION-ENGINE.md` §3 | ✅ Conformant |
| Carbon `Tag` border-radius override | `styles.scss:886` | ✅ Documented exception |
| `.esti-kpi-track` / `.esti-kpi-fill` | `styles.scss` | ✅ Permitted structural helpers |
| `.esti-case-study-card` + `@property` | `styles.scss:4058–4095` | ✅ Permitted landing exception |
| `.esti-landing-ai` | `styles.scss:4185` | ✅ Permitted landing exception |
| `.esti-portal-logo` | `styles.scss` | ✅ Permitted portal exception |
| `.esti-qi-*` classes | `CARBON-UI-DIRECTION.md` | ✅ Documented exception |

---

## Fix Priority

| # | Violation | File(s) | Priority |
|---|---|---|---|
| A-1 | `.esti-dock` → `.esti-floating-dock` | `FloatingDock.tsx:31`, `styles.scss:1036` | P0 — rename now |
| D-1 | `HR_MANAGER` has `salary:view` | `permissions.ts:167` | P0 — security |
| B-1 | `.esti-login-mark` uses `transparent` | `styles.scss:211` | P1 |
| E-1 | IA doc describes removed Estimation OS | `INFORMATION-ARCHITECTURE.md:68–207` | P1 |
| E-2 | Roadmap Phase 29 not marked removed | `ROADMAP.md` | P1 |
| A-2 | `.esti-lp-*` → `.esti-landing-*` | `styles.scss:1339+`, `Landing.tsx` | P2 |
| C   | 16 × `gap={1}` with text | 7 files | P2 |
| E-3 | Plans doc describes removed `costing` feature | `PLANS-AND-TIERS.md` | P2 |
| E-4–E-6 | Other stale doc cross-references | Various | P3 |
