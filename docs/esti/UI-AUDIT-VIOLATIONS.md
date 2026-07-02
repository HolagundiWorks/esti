# ESTI UI Audit — Carbon Design System Violations

**Date:** 2026-06-29  
**Audited by:** Claude Code (automated scan)  
**Scope:** `frontend/src/routes/*.tsx`, `frontend/src/components/**/*.tsx`, `frontend/src/styles.scss`  
**Standard:** CLAUDE.md — "The frontend must use ONLY the IBM Carbon Design System. No custom UI elements."

---

## Executive Summary

> **2026-07-02 reconciliation:** entries covering torn-down features — programme/Gantt
> (`esti-gantt__*`), the construction-schedule dependency canvas (`esti-dep-*`), steel/BBS
> reconciliation (`esti-steel-*`), and the Rate Books / Rate Analysis panels (`MasterDsr`,
> `RateAnalysisPanel`, `ProjectProgram`) — have been struck as stale. Findings for live
> modules are retained. Counts below predate this reconciliation and are approximate.

The frontend contains **230+ discrete violations** across the Carbon-only mandate.
Four violation categories identified, ordered by severity:

| # | Category | Count | Severity |
|---|---|---|---|
| A | Hard-coded hex colors (should be `--cds-*` tokens) | 45+ instances | Critical |
| B | Unpermitted CSS classes in `styles.scss` | 130+ classes | Critical |
| C | Inline decorative styles on JSX elements | 59+ instances | High |
| D | Decorative/non-structural rules inside custom classes | 80+ rules | High |

The permitted class list from CLAUDE.md is:  
`esti-fill`, `esti-grow`, `esti-dash`, `esti-cal`, `esti-cal-hdr`, `esti-cal-cell`,  
`esti-label` / `esti-label--secondary` / `esti-label--helper`,  
`esti-kpi-track` / `esti-kpi-fill`, `esti-heat-swatch`, `esti-bar-palette`,  
`esti-personal-panel` and sub-classes (`esti-pp-*`),  
`esti-chart-sm` / `esti-chart-md` / `esti-chart-lg`,  
`esti-login-shell` / `esti-login-panel`,  
`esti-toast-host`, `esti-pomodoro-float`, `esti-header-clock`, `esti-footer`.

Every other custom `esti-*` class is a violation unless it is purely colourless and structural.

---

## Category A — Hard-coded Hex Colors

### A1 · `frontend/src/routes/Dashboard.tsx`

All of these are used as JSX inline style values or SVG `stroke` attributes.

| Lines | Identifier | Hex values | Carbon token equivalents |
|---|---|---|---|
| 57–63 | `ZCOLOR` map | `#42be65`, `#f1c21b`, `#ff832b`, `#fa4d56`, `#6f6f6f` | `--cds-support-success`, `--cds-support-warning`, `--cds-support-warning-minor`, `--cds-support-error`, `--cds-text-disabled` |
| 66–71 | `TILE_COLOR` map | `#0f62fe`, `#6929c4`, `#009d9a`, `#1192e8` | `--cds-interactive`, `--cds-support-info-inverse`, (no token for purple/teal — use Tag component) |
| 74–76 | `LOAD_COLOR` map | `#fa4d56`, `#ff832b`, `#f1c21b`, `#42be65` | `--cds-support-error`, `--cds-support-warning-minor`, `--cds-support-warning`, `--cds-support-success` |
| 131–136 | `healthBand()` return | `#42be65`, `#4589ff`, `#f1c21b`, `#ff832b`, `#fa4d56` | Same as ZCOLOR row |
| 1740–1742 | `PRIORITY_COLOR` map | `#fa4d56`, `#ff832b`, `#f1c21b`, `#6f6f6f` | `--cds-support-error`, `--cds-support-warning-minor`, `--cds-support-warning`, `--cds-text-disabled` |
| 1797 | `scoreColor` inline | `"#fa4d56"`, `"#ff832b"`, `"#f1c21b"` | same as above |
| 1815 | `TableCell` style | `"#fa4d56"` | `--cds-support-error` |

Downstream inline-style usages of those maps:

| Line | Code |
|---|---|
| 297 | `style={{ color: attn.chainColor }}` — chainColor is from `ZCOLOR` |
| 300 | `style={{ color: band.color }}` — band.color is a raw hex from `healthBand()` |
| 317 | `stroke={ZCOLOR[state]}` — hex injected as SVG attribute |
| 1801 | `style={{ color: scoreColor, fontWeight: 600 }}` |
| 1804 | `style={{ color: PRIORITY_COLOR[t.priority] }}` on a `<Tag>` component |
| 1815 | `style={{ color: ... ? "#fa4d56" : "inherit" }}` on `<TableCell>` |

### A2 · `frontend/src/components/UserIdCard.tsx`

| Line | Code | Issue |
|---|---|---|
| 39 | `const roleColor = ... ?? "#525252"` | Hard-coded fallback hex |
| 62 | `style={{ background: roleColor }}` | Hex applied as background |
| 68 | `style={{ background: roleColor }}` | Hex applied as overlay background |

### A3 · `frontend/src/components/StaffAvatar.tsx`

| Lines | Code | Issue |
|---|---|---|
| 4–7 | `HASH_PALETTE = ["#0f62fe", "#6929c4", "#005d5d", "#198038", "#9f1853", "#b45309", "#1192e8", "#007d79"]` | 8 hard-coded hex values used as avatar background colors |

### A4 · `frontend/src/components/landing/LandingOperationalGrid.tsx`

| Lines | Code | Issue |
|---|---|---|
| 183–186 | Revision data objects `{ color: "#6929c4" }`, `{ color: "#fa4d56" }`, etc. | 4 hard-coded hex in chart data |
| 218 | `const accentColor = "#1192e8"` | Hard-coded hex constant |
| 280–281 | `L1: "#6929c4", L2: "#1192e8"`, …(7 values) | Level-color map with raw hex |
| 293 | `const levelBg = LEVEL_BG[level] ?? "#444"` | Hard-coded fallback hex |

### A5 · `frontend/src/styles.scss` (hard-coded hex inside class rules)

| Lines | Selector | Hex value | Rule violated |
|---|---|---|---|
| 133 | `html:has(.esti-app-shell) body` | `background: #161616` | Use `--cds-background` |
| 138 | `html:has(.esti-landing-shell) body` | `background: #0b0b0b` | Use `--cds-background` |
| 144 | `html:has(.esti-lp) body` | `background: #161616` | Use `--cds-background` |
| 1344–1360 | `.esti-lp` (custom token block) | 12 raw hex values as CSS custom properties | Entire block violates carbon-token-only rule |
| 1461 | `.esti-lp-bar__cta:hover` | `color: #78a9ff` | Use `--cds-link-inverse` |
| 1648 | `.esti-lp-note` | `color: #da1e28` | Use `--cds-support-error` |
| 1767 | `.esti-lp-text-link--invert` | `color: #78a9ff` | Use `--cds-link-inverse` |
| 1796 | `.esti-lp-panel` | `background: #fff` | Use `--cds-layer-01` |
| 1847 | `.esti-lp-picto--on-dark` | `color: #78a9ff` | Use `--cds-link-inverse` |
| 1888 | `.esti-lp-picto--logo` | `background: #fff` | Use `--cds-layer-01` |
| 2192 | `.esti-lp-card` | `background: #fff` | Use `--cds-layer-01` |
| 2356 | `.esti-lp-demo-card__tick` | `color: #78a9ff` | Use `--cds-link-inverse` |
| 2415 | `.esti-lp-demo-showcase__error` | `color: #ff8389` | Use `--cds-support-error` |
| 2450 | `.esti-lp-flow__step` | `background: #fff` | Use `--cds-layer-01` |
| 2504 | `.esti-lp-demo` | `background: #fff` | Use `--cds-layer-01` |

---

## Category B — Unpermitted CSS Classes in `styles.scss`

`styles.scss` is 7 854 lines. The permitted-class list covers ~20 selectors. The file defines **130+ additional class families** that are not in the permitted list. Grouped by subsystem:

### B1 · App shell and navigation (not permitted)

| Class(es) | Lines | Problem |
|---|---|---|
| `.esti-row`, `.esti-row-between` | 109–119 | Not in permitted list; layout helpers beyond the approved set |
| `.esti-app-shell`, `.esti-app-shell--demo` | 121–127 | Not permitted |
| `.esti-app-content` | 164–176 | Not permitted |
| `.esti-landing-shell` | 136–156 | Not permitted |
| `.esti-dashboard-page` | 158–162 | Not permitted |
| `.esti-app-mark` | 218–224 | Not permitted; icon sizing for brand mark |
| `.esti-login-brand`, `.esti-login-mark` | 203–217 | Not permitted (only `esti-login-shell/panel` are) |
| `.esti-page-header` | 228–230 | Not permitted |
| `.esti-portal-logo` | 1027–1031 | Not permitted |
| `.esti-dock` | 1036–1049 | Not permitted |
| `.esti-panel-overlay`, `.esti-panel-shell` | 982–995 | Not permitted |

### B2 · Chart sizing (partial violation)

| Class | Lines | Problem |
|---|---|---|
| `.esti-chart-medium` | 233 | Only `esti-chart-md` is permitted, not `esti-chart-medium` |
| `.esti-chart-canvas` | 236 | Not in permitted list |

### B3 · Drawing viewer (not permitted — 7 classes)

`.dwg-base`, `.dwg-viewport`, `.dwg-viewport__svg`, `.dwg-viewport-fs`, `.dwg-viewport-fs__bar`, `.dwg-viewport-fs__main`, `.dwg-viewport-fs__side` (lines 35–87).  
These also include **visual rules**: `border: 1px solid var(--cds-border-subtle)`, `background: var(--cds-layer-01)`, `border-radius: 4px`.

### B6 · Form layout helpers (not all permitted)

| Class | Lines | Status |
|---|---|---|
| `.esti-form-panel` | 540 | Not in permitted list |
| `.esti-form-panel--wide` | 541 | Not in permitted list |
| `.esti-firm-logo` | 542 | Not in permitted list |
| `.esti-input-md` | 543 | Not in permitted list |
| `.esti-input-sm` | 544 | Not in permitted list |

### B8 · Dashboard zone helpers (not permitted)

| Class | Lines | Problem |
|---|---|---|
| `.esti-zone-head` | 742–748 | Not permitted; also applies `color: var(--cds-text-secondary)` (visual rule in custom class) |

### B9 · Quality Intelligence tiles (not permitted — 12+ classes)

`.esti-qi-tiles`, `.esti-qi-layout`, `.esti-qi-tiles--landing`, `.esti-qi-tile--wide`, `.esti-qi-metrics--wide`, `.esti-qi-chart-label`, `.esti-qi-chart--radar`, `.esti-qi-chart--meter`, `.esti-qi-tile`, `.esti-qi-header`, `.esti-qi-metrics`, `.esti-qi-metric`, `.esti-qi-empty` (lines 751–838).

These include decorative rules: `font-size: 0.875rem`, `color`, `font-weight: 600`, `letter-spacing`, `text-transform`.

### B10 · AI assistant (not permitted — 10+ classes)

`.esti-ai-agent` (and BEM modifiers `__row`, `__fab`, `__mark`, `__bar`, `__reply`, `__reply-text`), `.esti-ai-explain__summary`, `.esti-ai-explain__list`, `.esti-ai-studio__title`, `.esti-ai-settings-tile` (lines 1051–1145).

### B11 · Floating widgets (not permitted)

`.esti-float-widget`, `.esti-float-panel-shell`, `.esti-float-settings`, `.esti-float-calc`, `.esti-float-pom-header`, `.esti-scroll-affordance` (and sub-classes) (lines 1147–1255).

### B12 · Marketing landing page (not permitted — 70+ classes)

The entire `.esti-lp` block (lines 1339–end of file) defines a parallel design system with:
- Custom CSS variables using raw hex (`.esti-lp { --lp-bg: #fafafa; ... }`)
- Custom typography scales (`font-size: clamp(...)`, `letter-spacing`)
- Custom button component `.esti-lp-btn` (replicates Carbon `Button`)
- Custom card/panel system (`esti-lp-card`, `esti-lp-panel`, `esti-lp-module`)
- Custom form fields (`esti-lp-input`, `esti-lp-field`, `esti-lp-check`)
- Custom scroll-reveal animation
- Custom nav bar and drawer

Classes include: `.esti-lp`, `.esti-lp-wrap`, `.esti-lp-bar`, `.esti-lp-bar__inner`, `.esti-lp-brand`, `.esti-lp-bar__nav`, `.esti-lp-bar__link`, `.esti-lp-bar__actions`, `.esti-lp-bar__signin`, `.esti-lp-bar__cta`, `.esti-lp-bar__menu`, `.esti-lp-backdrop`, `.esti-lp-drawer`, `.esti-lp-drawer__link`, `.esti-lp-reveal`, `.esti-lp-block`, `.esti-lp-block--*`, `.esti-lp-kicker`, `.esti-lp-head`, `.esti-lp-lead`, `.esti-lp-deck`, `.esti-lp-meta`, `.esti-lp-note`, `.esti-lp-pullquote`, `.esti-lp-hero-split`, `.esti-lp-hero-copy`, `.esti-lp-hero__actions`, `.esti-lp-hero__stage`, `.esti-lp-btn`, `.esti-lp-btn--*`, `.esti-lp-text-link`, `.esti-lp-board`, `.esti-lp-board__row`, `.esti-lp-panel`, `.esti-lp-panel__head`, `.esti-lp-picto`, `.esti-lp-module-grid`, `.esti-lp-card`, `.esti-lp-module`, `.esti-lp-demo-card`, `.esti-lp-demo-showcase`, `.esti-lp-flow`, `.esti-lp-trial`, `.esti-lp-field`, `.esti-lp-input`, `.esti-lp-check` (70+ selectors).

**Note:** `styles.scss` line 1339 has a comment: "Editorial design system — custom tokens & layout. Carbon is isolated to `.esti-lp-carbon`…" but CLAUDE.md only allows Carbon isolated to `.esti-lp-carbon` for dashboard-faithful **previews**. The rest of the landing page is not a documented exception.

### B13 · Legacy landing helpers (not permitted)

`.esti-card-col`, `.esti-stats-row`, `.esti-cta-row`, `.esti-mockup-frame`, `.esti-pricing-toggle`, `.esti-new-tag` (lines 1307–1337). Labelled "legacy" in a comment but still present in the stylesheet.

### B14 · Carbon class overrides (prohibited)

| Lines | Selector | Problem |
|---|---|---|
| 188–190 | `.cds--data-table-container { overflow-x: auto }` | Overrides Carbon's own class — not permitted |
| 886–888 | `.cds--tag { border-radius: 0 }` | Global override of Carbon Tag radius — visual override of Carbon component |

### B15 · Pomodoro and header extras (partially not permitted)

| Class | Lines | Status |
|---|---|---|
| `.esti-header-pom` | 1008–1011 | Not in permitted list |
| `.esti-header-pom--active` | 1280–1282 | Not in permitted list |
| `.esti-pom-ring` | 1285 | Not in permitted list (only `esti-pomodoro-float` is) |
| `.esti-pom-ring--run` | 1286–1289 | Not in permitted list |
| `.esti-pom-running-timer` | 1013–1025 | Not in permitted list |

### B16 · ID card and staff tile classes (in TSX, not in styles.scss)

Used in TSX files but the matching CSS lives in styles.scss beyond the read window (confirmed by grep — 77 occurrences in styles.scss):

`esti-id-card`, `esti-id-card__photo-area`, `esti-id-card__photo`, `esti-id-card__initials-bg`, `esti-id-card__initials`, `esti-id-card__overlay`, `esti-id-card__badge`, `esti-id-card__body`, `esti-id-card__name` — not in permitted list.

`esti-av-strip`, `esti-av-strip__shape`, `esti-av-strip__issue`, `esti-av-strip__action`, `esti-av-strip__health` — not in permitted list (Dashboard.tsx lines 296–301).

`esti-geo`, `esti-geo--circle`, `esti-geo--triangle`, `esti-geo--square` — not in permitted list (Dashboard.tsx).

`esti-screen`, `esti-screen__hdr`, `esti-screen__hdr-title` — not in permitted list (Dashboard.tsx line 1754).

`esti-blog`, `esti-blog__head`, `esti-blog__back`, `esti-blog__empty`, `esti-blog-article`, `esti-blog-article__body`, `esti-blog-article__byline`, `esti-blog-roadmap`, `esti-blog-card__tags`, `esti-blog-theme` — not in permitted list (Legal.tsx, SeoLanding.tsx, BlogPost.tsx).

`esti-profile-member-tile`, `esti-profile-member-tile--active`, `esti-avatar-name-cell`, `esti-staff-avatar`, `esti-staff-tile__level-badge` — not in permitted list (StaffProfilesTab.tsx).

---

## Category C — Inline Decorative Styles on JSX Elements

Grep finds **59 occurrences** of inline decorative style props across **17 files**.

### C1 · `frontend/src/routes/Dashboard.tsx` (28 occurrences)

| Line | Code | Violation |
|---|---|---|
| 297 | `style={{ color: attn.chainColor }}` | Inline color from hex map |
| 300 | `style={{ color: band.color }}` | Inline color from hex return |
| 314 | `style={{ transform: "rotate(-90deg)", flexShrink: 0 }}` | Inline structural+decorative mix on SVG |
| 1801 | `style={{ color: scoreColor, fontWeight: 600 }}` | Color + weight inline |
| 1804 | `style={{ color: PRIORITY_COLOR[t.priority] }}` | Color inline on Tag (Tag type prop should carry color) |
| 1815 | `style={{ color: ... ? "#fa4d56" : "inherit" }}` | Hard hex inline |

(22 additional inline style usages within Dashboard.tsx — full list from automated scan.)

### C2 · `frontend/src/components/hr/StaffProfilesTab.tsx` (4 occurrences)

| Line | Code | Violation |
|---|---|---|
| 112 | `style={{ width: 36, height: 36, minWidth: 36, background: color, fontSize: 13 }}` | background + fontSize inline |
| 117 | `style={{ fontWeight: 600, fontSize: "0.875rem" }}` | typography decorative inline |
| 123 | `style={{ background: color, marginInlineStart: "auto" }}` | background inline |

Rule: use Carbon `label-01` type-style (`esti-label` class) instead of `fontSize: "0.875rem"` inline. Background colors should come from `--cds-` tokens or a Tag component.

### C3 · `frontend/src/components/UserIdCard.tsx` (4 occurrences)

| Line | Code | Violation |
|---|---|---|
| 45 | `style={{ position: "relative" }}` | Structural-ish, but belongs in a CSS class |
| 62 | `style={{ background: roleColor }}` | background from hex value |
| 68 | `style={{ background: roleColor }}` | background from hex value |

### C4 · `frontend/src/routes/Team.tsx` (4 occurrences)

Inline color/background styles used to colorize staff avatars and capacity indicators — same pattern as Dashboard and StaffProfilesTab.

### C5 · `frontend/src/components/landing/LandingOperationalGrid.tsx` (3 occurrences)

Inline `style={{ background: ... }}` on chart bars using raw hex values from `LEVEL_BG` and `accentColor`.

### C6 · Additional files with inline decorative styles

| File | Count | Type |
|---|---|---|
| `frontend/src/routes/Portal.tsx` | 2 | inline color / fontSize |
| `frontend/src/routes/ClientRequests.tsx` | 2 | inline color |
| `frontend/src/components/ProjectDrawings.tsx` | 2 | inline color |
| `frontend/src/components/PomodoroRing.tsx` | 3 | inline SVG color values |
| `frontend/src/components/hr/ApplicationsTab.tsx` | 1 | inline color |
| `frontend/src/components/ProjectSettings.tsx` | 2 | inline padding / fontSize |
| `frontend/src/components/ProjectSiteReference.tsx` | 1 | inline background |
| `frontend/src/components/work/WorkloadTab.tsx` | 1 | inline background |
| `frontend/src/components/PdfActionButtons.tsx` | 1 | inline color |

---

## Category D — Decorative/Non-structural Rules Inside Custom Classes

CLAUDE.md states custom CSS must be "structural and colourless". Many custom classes contain visual rules.

### D1 · Typography rules inside custom classes

Multiple custom classes set `font-size`, `font-weight`, `letter-spacing`, `line-height`, `text-transform`, `color` — all of which belong in Carbon type-style tokens (`@include type.type-style(...)`) or Carbon component props.

Examples:
- `.esti-qi-metric` (line 817): `font-size: 0.875rem; line-height: 1.34` — use `esti-label` + `body-compact-01`
- `.esti-qi-chart-label` (line 775): `font-weight: 600; letter-spacing; text-transform; color`

### D2 · Background and visual rules in custom classes

_All originally-cited instances (`esti-dep-*`, `esti-steel-*`, `esti-gantt__*`) belonged to
the now-removed construction-schedule, steel/BBS, and programme-Gantt features and have been
struck. Re-scan surviving custom classes for `box-shadow` / `background` / `linear-gradient`
decorative rules if this category is reworked._

### D3 · Keyframe animations in custom scope

Five keyframe animations defined at the custom-class level (not using Carbon Motion tokens):

| Keyframe | Lines | Problem |
|---|---|---|
| `esti-lp-kpi-in` | referenced in lp-qi-preview block | Custom entrance animation |
| `esti-lp-qi-chart-grow` | 874–883 | Custom scale animation |
| `esti-pom-pulse` | 1290–1293 | Opacity pulse — uses `var(--esti-motion-duration-slow-02)` (not a Carbon token) |
| `esti-motion-fade-in` | referenced in `.esti-float-widget` | Custom fade-in |
| Landing page scroll reveal | `.esti-lp-reveal` (line 1516) | Custom CSS transition on opacity + transform |

Note: `--esti-motion-*` tokens referenced in several places are not Carbon tokens — they appear to be custom motion tokens defined elsewhere (likely `scss/carbon-motion.scss`), which is itself a violation if it overrides Carbon's motion system.

---

## Top Offending Files (by violation count)

| File | Approx. violations | Primary issues |
|---|---|---|
| `frontend/src/styles.scss` | 130+ class violations, 20+ hex colors | Entire landing system, plus AI / floating-widget / QI class families |
| `frontend/src/routes/Dashboard.tsx` | 60+ | 5 hex color maps, 28 inline styles, 8+ unpermitted class uses |
| `frontend/src/components/UserIdCard.tsx` | 10+ | Unpermitted classes, hex fallback, inline backgrounds |
| `frontend/src/components/hr/StaffProfilesTab.tsx` | 8 | Unpermitted classes, inline fontSize/fontWeight/background |
| `frontend/src/components/StaffAvatar.tsx` | 8+ | 8-value hex palette |
| `frontend/src/components/landing/LandingOperationalGrid.tsx` | 12+ | Hex color maps, inline styles |
| `frontend/src/routes/Legal.tsx` / `SeoLanding.tsx` / `BlogPost.tsx` | 10+ | `esti-blog` class family |

---

## Remediation Priority

### Priority 1 — Quick wins (no component rebuild needed)

1. Replace all hard-coded hex values in color maps (`ZCOLOR`, `TILE_COLOR`, `LOAD_COLOR`, `healthBand`, `PRIORITY_COLOR`, `HASH_PALETTE`) with CSS custom property references (`var(--cds-support-success)`, etc.) or Carbon Tag `type` prop values.
2. Remove `style={{ color: ..., fontWeight: ..., fontSize: ... }}` inline props; replace `fontSize` with `esti-label` class, `color` with Tag type props or token-based CSS class.
3. Replace `#525252` fallback in `UserIdCard.tsx` with `var(--cds-text-secondary)`.
4. Replace hard-coded hex in `styles.scss` class rules with `--cds-*` tokens (see Category A5 table).

### Priority 2 — CSS class consolidation

5. Remove all unpermitted classes from `styles.scss` and replace usages in TSX with approved Carbon components:
   - `esti-av-strip` → Carbon `InlineNotification` or `Tag`
   - `esti-id-card` → Carbon `Tile` + `Stack`
   - `esti-staff-avatar` / `esti-profile-member-tile` → Carbon `Tile` with `Stack` layout
   - `esti-zone-head` → `<h3>` inside a `<Grid>/<Column>` with `Stack`
   - `esti-screen`, `esti-screen__hdr` → Carbon content grid structure
6. Consolidate `.esti-blog*` into a minimal set of colourless structural helpers or use Carbon `Tile`/`Content` components.

### Priority 3 — Subsystem redesign (requires planning)

7. **Landing page** (`esti-lp-*`): Replace custom design system with Carbon components where possible. The comment in styles.scss acknowledges this tension; a product decision is needed about whether the landing page is within Carbon scope.

---

## Notes

- The `esti-personal-panel` and `esti-pp-*` sub-classes are **permitted** — they are correctly listed in CLAUDE.md.
- The `esti-footer`, `esti-toast-host`, `esti-header-clock`, `esti-pomodoro-float` classes are **permitted**.
- The `esti-kpi-track` / `esti-kpi-fill` classes are **permitted** (dynamic `width` and `background` inline are explicitly allowed for ASPRF bars).
- The `esti-heat-swatch` class is **permitted** (`backgroundColor` dynamic inline is allowed for heatmap legend).
- Carbon `ProgressBar` must be used instead of any hand-rolled bar; Carbon `Tag` must carry status semantics instead of inline `color` overrides.
