# DESIGN LAW — ESTI AORMS UI Constitution

These rules are non-negotiable. Every PR touching `frontend/` must comply. No exceptions without a written architectural decision record.

---

## Rule 1 — Carbon-only UI

The frontend uses the IBM Carbon Design System exclusively. All UI elements must come from `@carbon/react`, `@carbon/icons-react`, or `@carbon/pictograms-react`.

**Permitted imports:** `Grid`, `Column`, `Tile`, `ClickableTile`, `Tag`, `ProgressBar`, `Stack`, `Tabs`, `TabList`, `Tab`, `TabPanel`, `TabPanels`, `Modal`, `Select`, `SelectItem`, `DataTable`, `Table`, `TableContainer`, `TableHead`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableToolbar`, `TableToolbarContent`, `TableToolbarSearch`, `Button`, `TextInput`, `TextArea`, `Toggle`, `Checkbox`, `Search`, `InlineNotification`, `InlineLoading`, `Loading`, `DataTableSkeleton`, `Pagination`, `CodeSnippet`, `FileUploaderButton`, `NumberInput`, `Header`, `HeaderName`, `HeaderGlobalBar`, `HeaderGlobalAction`, `SideNav`, `SideNavItems`, `SideNavLink`, `SideNavMenu`, `SideNavMenuItem`, `Content`, `Theme`, `MeterChart` (from `@carbon/charts-react`).

**Never permitted:** hand-rolled card components, bespoke progress bars, custom badge elements, standalone SVG icon buttons (use `@carbon/icons-react` instead), non-Carbon modal/dialog implementations, any third-party UI library component.

---

## Rule 2 — No rounded corners, no shadows, no gradients

Carbon g100 is flat and sharp. Do not apply:
- `border-radius` values above 2px (only permitted for the `dwg-viewport` drawing container and gantt bars — structural purpose only)
- `box-shadow` of any kind
- `background: linear-gradient(...)` or `background: radial-gradient(...)`
- `filter: drop-shadow(...)` or `filter: blur(...)`

The dashboard telemetry tiles use `border-top: 2px solid <alert-colour>` — this is the only decorative border permitted and only in that context.

---

## Rule 3 — Spacing scale

All `padding`, `margin`, `gap`, `top`, `left`, `right`, `bottom` values must come from the Carbon spacing scale:

| Token | CSS variable | Value |
|---|---|---|
| spacing-01 | `var(--cds-spacing-01)` | 2px |
| spacing-02 | `var(--cds-spacing-02)` | 4px |
| spacing-03 | `var(--cds-spacing-03)` | 8px |
| spacing-04 | `var(--cds-spacing-04)` | 12px |
| spacing-05 | `var(--cds-spacing-05)` | 16px |
| spacing-06 | `var(--cds-spacing-06)` | 24px |
| spacing-07 | `var(--cds-spacing-07)` | 32px |
| spacing-08 | `var(--cds-spacing-08)` | 40px |
| spacing-09 | `var(--cds-spacing-09)` | 48px |

**Forbidden values:** any px value not in this table as a spacing value. Inline `gap: 4` (raw integer) in JSX is also forbidden — use `Stack gap={4}` or `var(--cds-spacing-02)`.

---

## Rule 4 — Typography scale

Font sizes must match Carbon type-style pixel equivalents:

| Pixels | Carbon type style |
|---|---|
| 12px | `label-01`, `code-01` |
| 14px | `body-compact-01`, `body-01` |
| 16px | `body-compact-02`, `body-02` |
| 20px | `heading-03` |
| 24px | `heading-04` |
| 28px | `heading-05` |
| 32px | `heading-06` |

**Forbidden:** raw `fontSize: 13` inline style. Use `.esti-label` class (maps to `label-01`) for hint text. Never set `fontSize` as an inline style prop. Use Carbon type classes or semantic HTML (`h1–h4`, `p`).

---

## Rule 5 — Colour: tokens only

All colours must use `--cds-*` design tokens or the documented AORMS alert/identity palette. No hardcoded hex values in component JSX or `.scss` files outside the documented palette.

**Documented AORMS exception palette (Dashboard.tsx alert/identity semantics only):**

| Name | Hex | Semantic use |
|---|---|---|
| alert-stable | `#42be65` | Stable / healthy state indicator |
| alert-watch | `#f1c21b` | Watch / elevated state indicator |
| alert-friction | `#ff832b` | Friction / degraded state indicator |
| alert-critical | `#fa4d56` | Critical / intervention required |
| identity-client | `#0f62fe` | CLIENT zone identity border |
| identity-finance | `#6929c4` | FINANCE zone identity border |
| identity-project | `#009d9a` | PROJECT zone identity border |
| identity-team | `#1192e8` | TEAM zone identity border |
| bg-app | `#161616` | App shell background |
| bg-landing | `#0b0b0b` | Landing page background |
| info-blue | `#4589ff` | Info state in ALERT_COLOR map only |

**Known-good staff colour for team tiles:** `resolveColor()` from `StaffAvatar.tsx` computes colours dynamically from staff level — these are permitted in `Team.tsx` for portrait photo backgrounds only.

**Forbidden outside this palette:** any other hex or rgb value in component files.

---

## Rule 6 — Dark theme g100 only

The office shell uses Carbon g100 exclusively. The `Theme` wrapper in `App.tsx` must not be changed to `white`, `g10`, or `g90` for any staff route. The client portal (`Portal.tsx`) and contractor bid portal are the only permitted white-theme exceptions, using explicit `Theme theme="white"` for their isolated routes.

---

## Rule 7 — No duplicate components

If a UI pattern exists in a shared component file, use it. Do not re-implement it inline. Known shared components:
- `PageHeader` — all route title blocks (h1 + description + optional actions)
- `DataState` — all loading/empty states on list screens
- `ConfirmModal` — all destructive action confirmations
- `PeriodFilter` — all date/FY filter controls
- `ZoneTile`, `KpiChip`, `ZoneHead`, `FilingTile` — dashboard tile primitives in `dashboardUi.tsx`

If two screens need the same UI pattern, extract it to a shared component file first.

---

## Rule 8 — Every PR passes these checks

Before raising a PR touching frontend code, the author confirms:

1. No non-Carbon component has been introduced
2. All spacing values are on the Carbon scale
3. No hardcoded hex colours outside the AORMS exception palette
4. No inline `fontSize` style props (use `.esti-label` or semantic HTML)
5. Shared components (`PageHeader`, `DataState`, `ConfirmModal`) are used wherever applicable — not re-implemented inline
