# HCW Catalog — elements · components · patterns · pictograms · icons

**Canonical inventory of Human Centric Works.** Every public surface of `@hcw/ui-kit`
is listed here with its **attributes**. This document is the source of truth for
what exists; implementation details live in `src/`. Do not invent parallel names.

**Thesis:** depth encodes importance — flat (information) · soft (objects) ·
glass (action). **One accent** — Radiant Orange (`#FF4F18`) for fills and active
chrome tints only. **Brand face** — Urbanist. Surfaces are square; only buttons,
dialogs, and the ActionDock capsule round.

---

## How to read attributes

| Column | Meaning |
| --- | --- |
| **Attribute** | Prop, option, or token key |
| **Type / values** | Allowed values or shape |
| **Default** | When omitted |
| **Notes** | Rules / a11y / pairing |

---

# 1. Foundations

### Colour roles (`colors` / schemes)

| Attribute | Type / values | Notes |
| --- | --- | --- |
| `scheme` | `light` · `dark` · `highContrast` | Via `KitRoot` / `createHcwTheme` |
| Roles | `background` · `layer01` · `layer02` · `borderSubtle` · `borderStrong` · `textPrimary` · `textSecondary` · `textHelper` · `textOnColor` · `ink` · `onAccent` · `accent` · `accentSoft` · `accentDark` · `hoverSoft` · `supportSuccess` · `supportWarning` · `supportError` · `supportInfo` | Every scheme carries every role |

### Type (`TYPE_SCALE`)

| Attribute | Value |
| --- | --- |
| `micro` | `0.65rem` |
| `caption` | `0.75rem` |
| `label` | `0.8125rem` |
| `body2` | `0.875rem` |
| `body` | `1rem` |
| `kpi` | `1.1rem` |
| `subtitle` | `1.25rem` |
| `heading` | `1.75rem` |
| `display` | `2.625rem` |

### Spacing (`SPACING`)

`none` 0 · `xxs` 2 · `xs` 4 · `sm` 8 · `compact` 12 · `md` 16 · `lg` 24 · `xl` 32 · `section` 40 · `xxl` 48 · `xxxl` 64. Unit = 8.

### Layout (`LAYOUT`)

| Attribute | Value | Notes |
| --- | --- | --- |
| `columns` | `12` | Stage content grid |
| `gutter` / `margin` | `16` | |
| `railWidth` | `240` | Kit portals |
| `railWidthCollapsed` | `56` | |
| `railFraction` / `stageFraction` | `0.2` / `0.8` | Fluid shells |
| `contentMaxWidth` | `1280` | |
| `taskbarHeight` | `56` | |
| `dockClearance` | `16` | |

Helpers: `layoutSx.rail` · `.stage` · `.content` · `.grid` · `.page` · `.listToolbar` · `.formField`.

### Density (`DENSITY` / `densityFor`)

| Attribute | Comfortable | Compact |
| --- | --- | --- |
| `control` / `tab` / `listItem` | 40 | 32 |
| `button` | 36 | 32 |
| `input` | 40 | 32 |
| `chip` | 28 | 22 |
| `dataGridRow` | 48 | 36 |
| `iconButton` (in-content) | 38 | 32 |
| Chrome icons | **44** via `chromeIconSx`; **48** under `KitRoot coga="calm"` | |

Mount: `KitRoot density="comfortable" | "compact"` · `coga="default" | "calm"`.

### Shape

| Token | Value | Where |
| --- | --- | --- |
| `RADIUS` | `0` | Surfaces, panels |
| `BUTTON_RADIUS` | `4` | Actions |
| `DIALOG_RADIUS` | `8` | Confirm / dialogs |
| `DOCK_PILL_RADIUS` | `9999` | ActionDock |
| `MARKETING_DOCK_RADIUS` | `12` | SectionDock |

### Motion (`MOTION`)

Durations: `instant` 80 · `fast` 130 · `base` 200 · `slow` 320. Gate transforms with `REDUCE_MOTION`.

### Elevation / layers (`LAYERS` / `ELEVATION`)

| Layer | Name | Role |
| --- | --- | --- |
| 1 | `flat` | Information at rest |
| 2 | `soft` | Objects you work within |
| 3 | `glass` · `clearGlass` · `headingGlass` | Live / atmospheric action |

---

# 2. Elements

Themed controls — appearance owned by `createHcwTheme`. Use HCW names below.

### Action (Button)

| Attribute | Values | Default | Notes |
| --- | --- | --- | --- |
| `variant` | text · outlined · contained | — | Contained CTA = accent fill language via theme |
| `tone` | default · primary · danger | default | Map danger → error colour |
| `disabled` | bool | false | |
| Page-level CTAs | — | — | **Must** go to ActionDock, never inline |

### Glyph action (IconButton)

| Attribute | Values | Notes |
| --- | --- | --- |
| In-content size | density `iconButton` | |
| Persistent chrome | `sx={chromeIconSx}` | ≥44×44 |
| `aria-label` | string | Required when icon-only |

### Toggle group

| Attribute | Values | Notes |
| --- | --- | --- |
| Selected | accent wash | Never a second brand hue |

### Field (TextField / Select / Autocomplete)

| Attribute | Values | Notes |
| --- | --- | --- |
| Surface | neumorphic inset well | |
| Default size | small | |
| Search | `sx={searchFieldSx}` + start adornment | Pair with `layoutSx.listToolbar` |

### Choice (Checkbox · Radio · Switch · Slider)

| Attribute | Notes |
| --- | --- |
| Active | accent |
| Focus | `FOCUS_RING` parity with hover |

### Chip

| Attribute | Notes |
| --- | --- |
| Shape | square |
| Status | **Forbidden** as filled status — use StatusDot |

### Tooltip

| Attribute | Values |
| --- | --- |
| Surface | ink slab, square |
| Type | `TYPE_SCALE.micro` |

### Alert

| Attribute | Values | Notes |
| --- | --- | --- |
| `severity` | error · warning · success · info | |
| `variant` | standard · filled | Standard error/warning = tinted glass; filled = solid support (toasts) |

### Dialog

| Attribute | Notes |
| --- | --- |
| Surface | neumorphic pop (`DIALOG_RADIUS`) |
| Destroy | ConfirmModal |
| `aria-labelledby` | Required |

### Tabs

| Attribute | Notes |
| --- | --- |
| Selected | inset top accent rule (`TAB_ALERT_WIDTH`) |
| Height | density `tab` |

### Link

| Attribute | Notes |
| --- | --- |
| Colour | slate (`supportInfo`) — **never** accent |

### Table / DataGrid

| Attribute | Notes |
| --- | --- |
| Headers | micro uppercase, secondary ink |
| Rows | hairline; density `dataGridRow` |
| Selection | accent soft wash |

### Progress / Skeleton

| Attribute | Notes |
| --- | --- |
| Loading grammar | Prefer DataState |

### Pagination / Stepper / Date calendar

| Attribute | Notes |
| --- | --- |
| Selected / active | accent + onAccent |
| Day today | accent hairline |

### List

| Attribute | Notes |
| --- | --- |
| Selected item | `layer02` |
| Subheader | micro uppercase |
| Toolbar | `layoutSx.listToolbar` |

### Panel (Paper / Card / Drawer / AppBar)

| Attribute | Notes |
| --- | --- |
| Rest | flat, square, hairline — no elevation theatre |
| Lifted objects | Surface `layer="soft|glass"` |

---

# 3. Components

### KitRoot (`KitRoot` · alias `MuiRoot`)

Mounts theme + date localisation once at the portal root.

| Attribute | Type / values | Default |
| --- | --- | --- |
| `children` | node | required |
| `scheme` | `light` · `dark` · `highContrast` | `light` |
| `density` | `comfortable` · `compact` | `comfortable` |
| `coga` | `default` · `calm` | `default` |
| `direction` | `ltr` · `rtl` | `ltr` |
| `locale` | BCP 47 string | `en-IN` |
| `theme` | full theme override | — (wins over scheme/density/coga/direction) |

Theme factory: `createHcwTheme({ scheme?, density?, coga?, direction? })` · singleton `hcwTheme`.  
Calm: larger interactive floors (`COGA.calmTargetMinPx`) + one type step; sets `data-hcw-coga`.  
RTL: sets `dir` / `data-hcw-direction`; pair with Emotion `createHcwRtlCacheOptions` — [13-ROADMAPS.md](13-ROADMAPS.md).  
Token export: [02-TOKEN-EXPORT.md](02-TOKEN-EXPORT.md).

### Surface

| Attribute | Type / values | Default |
| --- | --- | --- |
| `layer` | `flat` · `soft` · `glass` · `clearGlass` · `headingGlass` | `flat` |
| + box layout props | padding, etc. | |

Class: `hcw-surface`. Always square.

### GlassRail

| Attribute | Type / values | Default |
| --- | --- | --- |
| `rail` | node | required |
| `children` | node (stage) | required |
| `glass` | `frost` · `clear` | `frost` |
| `railAriaLabel` | string | `"Navigation"` |
| `mainId` | string | `"esti-main"` |

### ActionDock + provider

| Export | Attributes |
| --- | --- |
| `ActionDockProvider` | `children` |
| `ActionDock` | (none) — reads published actions |
| `useScreenActions(actions, deps?)` | publishes `DockAction[]` |
| `useDockActions()` | reads current actions |

#### DockAction

| Attribute | Type / values | Required |
| --- | --- | --- |
| `id` | string | yes |
| `label` | string | yes |
| `zone` | `left` · `center` · `right` | yes |
| `onClick` | fn | yes |
| `icon` | node | no |
| `tone` | `default` · `primary` · `danger` | no |
| `disabled` | bool | no |
| `iconOnly` | bool | no |
| `outcome` | `{ status; label; detail? }` | no — `publishOutcome` after click |
| `track` | bool | no — emit `ux.dock` (default true when `outcome` set) |

**Zone law:** left = destroy/exit · center = create · right = commit. Hide dock while a create/edit dialog owns commit (`publish []`).  
**Capacity:** > `CAPACITY.dockVisibleActions` → trim (prefer primary/danger) + `ux.capacity_warn`.

### KpiStrip

| Attribute | Type / values | Default |
| --- | --- | --- |
| `items` | `{ id; label; value; onClick? }[]` | required — capped at `CAPACITY.kpiStrip` |
| `aria-label` | string | `"Key measures"` |

### Orchestration (T10)

| Export | Job |
| --- | --- |
| `MissionHeader` | One-sentence mission + optional status |
| `ObjectiveList` | Objectives ≤ `CAPACITY.railObjectives` |
| `PhaseStrip` | Phase · progress (0–1) · eta |
| `ConfidenceBand` | `low` · `medium` · `high` (word band, not lone %) |
| `DecisionCard` / `DecisionQueue` | Pending decisions; ≤ `CAPACITY.decisionAlternatives` |
| `FrozenDecisionRow` / `FreezeTable` | Locked decisions |

### AwarenessStrip · ActionOutcomeBanner

| Export | Attributes |
| --- | --- |
| `AwarenessStrip` | `state` · `meaning` · `next` · `loops[]` · `judgment` — loops capped at `CAPACITY.openLoops` |
| `publishOutcome` / `ActionOutcomeBanner` | closes evaluation gulf after dock commits |

Exported type: `AwarenessStripProps`.

### Telemetry

| Export | Job |
| --- | --- |
| `setUxEventSink` / `logUxEvent` | Product analytics sink |
| `logOrient` · `logDecision` · `logMission` · `logInterrupt` | Typed KPI vocabulary |
| `enforceCapacity` / `assertCapacity` | Cap + `ux.capacity_warn` |

### SectionDock

| Attribute | Type / values | Default |
| --- | --- | --- |
| `links` | `{ href; label }[]` | required |
| `pathname` | string | required |
| `hash` | string | `""` |
| `aria-label` | string | `"Page sections"` |

### TaskbarFooter · TaskbarButton

| Attribute | Type / values | Default |
| --- | --- | --- |
| `left` / `center` / `right` | node | — |
| `showClock` | bool | `true` |
| TaskbarButton `icon` | node | required |
| TaskbarButton `label` | string | required |
| TaskbarButton `active` | bool | `false` |
| TaskbarButton `onClick` | fn | — |

Height token: `TASKBAR_HEIGHT` (56).

### BrandMark

| Attribute | Type / values | Default |
| --- | --- | --- |
| `label` | string | `"AORMS"` |
| `size` | `sm` · `md` · `lg` | `md` |
| `accent` | bool | `true` |
| `accentShape` | `auto` · `a` · `square` | `auto` |

### StatusDot

| Attribute | Type / values | Default |
| --- | --- | --- |
| `label` | node | required |
| `color` | status hue name or CSS | `"gray"` |
| `size` | `sm` · `md` | `sm` |
| `shape` | `circle` · `triangle` · `square` | `circle` |

Named hues: `red` · `magenta` · `purple` · `blue` · `cyan` · `teal` · `green` · `gray` · `cool-gray` · `warm-gray`.  
Helper: `statusShapeFor(severity)` maps `STATUS_SHAPE` (ok→circle · watch→triangle · critical→square).

### HealthGlassOrb

| Attribute | Type / values | Default |
| --- | --- | --- |
| `state` | `stable` · `watch` · `friction` · `critical` · `inactive` | required |
| `variant` | `flat` · `glass` | `glass` |
| `size` | number (px) | `14` |
| `title` | string | derived label |

Role `img`. Shape encodes severity (see Pictograms).

### Avatar

| Attribute | Type / values | Default |
| --- | --- | --- |
| `name` | string | required |
| `photoUrl` | string \| null | — |
| `color` | CSS (caller-injected) | secondary ink |
| `size` | `xs` · `sm` · `md` · `lg` · `xl` | `md` |

Helper: `getInitials(name)`.

### PageBreadcrumb

| Attribute | Type / values | Default |
| --- | --- | --- |
| `items` | `{ label; to? }[]` | required |
| `linkComponent` | element type | `"a"` |
| `linkPropName` | `href` · `to` | `href` |
| `aria-label` | string | `"Breadcrumb"` |

Separator pictogram: `›`.

### DataState

| Attribute | Type / values | Default |
| --- | --- | --- |
| `loading` | bool | required |
| `isEmpty` | bool | required |
| `empty` | `{ title; description?; action? }` | required |
| `columnCount` | number | `4` |
| `skeleton` | node | table skeleton |
| `children` | node | required |

### ConfirmModal

| Attribute | Type / values | Default |
| --- | --- | --- |
| `open` | bool | required |
| `heading` | string | `"Are you sure?"` |
| `body` | node | required |
| `kind` | `slip` · `mistake` | `slip` |
| `reason` | node | — (mistake-path explanation) |
| `confirmText` | string | `"Delete"` |
| `danger` | bool | `true` |
| `pending` | bool | `false` |
| `onConfirm` / `onClose` | fn | required |

Exported type: `ConfirmModalProps`.

### Toast

| Export | Attributes |
| --- | --- |
| `ToastHost` | (none) — mount once |
| `pushToast({ kind, title, subtitle?, undoLabel?, onUndo? }, ttlMs?)` | `kind`: error · success · info · warning; stack capped at `CAPACITY.toastStack` (+ `ux.capacity_warn`) |
| `dismissToast(id)` | |
| `useToasts()` | |

---

# 4. Patterns

| Pattern | Attributes / contract |
| --- | --- |
| **Spatial shell** | Rail · Stage · Taskbar · Dock — never invent a fourth region |
| **Dock zones** | left destroy · center create · right commit |
| **Never blank stage** | DataState wrapping lists/grids |
| **Destroy confirms** | ConfirmModal — never `window.confirm` |
| **Transient feedback** | ToastHost + pushToast (not ad-hoc snackbars) |
| **Status** | StatusDot (+ HealthGlassOrb for zone health) — never filled Chip |
| **List toolbar** | `layoutSx.listToolbar` + `searchFieldSx` |
| **Wayfinding** | PageBreadcrumb on deep screens |
| **Chart series** | `withChartSeriesColors` / `chartPalette` + markers |
| **Page CTAs** | ActionDock only |
| **Templates** | T1–T10 in [05-TEMPLATES.md](05-TEMPLATES.md) |

---

# 5. Pictograms

Kit-owned shapes that encode meaning. Registry: `PICTOGRAM` in `src/pictograms.ts`.

### Brand accent

| Attribute | Values |
| --- | --- |
| `accentShape` | `auto` · `a` (masked mark) · `square` |
| `size` | `sm` · `md` · `lg` |

### Health / zone

| State | Shape | Fill role |
| --- | --- | --- |
| `stable` | circle | `supportSuccess` |
| `watch` | triangle | `supportWarning` |
| `friction` | triangle | `supportWarning` |
| `critical` | square | `supportError` |
| `inactive` | circle | `textHelper` |

### Status

| Attribute | Value |
| --- | --- |
| Shape | **circle** only |
| Dot size | sm 8 · md 10 |
| Label | ink, required |

### Chart markers (`CHART_MARKERS`)

Order: `circle` · `square` · `triangle` · `diamond` · `cross` · `star`  
Helpers: `chartMarkerAt(i)` · `withChartSeriesColors(series, { markers: true })`.

### Avatar mark

| Mode | When |
| --- | --- |
| `photo` | `photoUrl` present |
| `initials` | otherwise (`getInitials`) |

### Breadcrumb separator

Glyph `›` (not an injected icon).

---

# 6. Icons

**The kit does not ship an icon font.** Consumers inject glyphs into slots.

| Attribute | Values / rule |
| --- | --- |
| `slot` | `dock` · `taskbar` · `chrome` · `inline` · `breadcrumb` |
| `size` | sm 16 · md 20 · lg 24 · xl 32 (`ICON_SIZE`) |
| `tone` | `default` · `accent` · `danger` |
| Accessible name | Required when the control is icon-only |
| Chrome hit target | ≥ `ICON.chromeHit` (44) via `chromeIconSx` |

Exports: `ICON` · `ICON_SLOTS` · `ICON_SIZE`.

---

# 7. Data visualisation

| Palette | Use | Helpers |
| --- | --- | --- |
| Categorical | Multi-series | `chartSeriesColors` · `chartColorAt` · `chartPalette("categorical", n)` |
| Sequential | Intensity / heatmap | `sequentialColors` · `DATA_VIZ_SEQUENTIAL` |
| Diverging | Polarity / delta | `divergingColors` · `DATA_VIZ_DIVERGING` |
| Semantic | KPI polarity | `DATA_VIZ_SEMANTIC` (positive · negative · caution · neutral · info) |

| Chrome | Helper |
| --- | --- |
| Axis / grid / legend / tooltip | `chartChromeFor(scheme)` · `CHART_CHROME` |
| Chart root styling | `chartRootSx(scheme)` |
| Area fill | `chartAreaFill(stroke, alpha?)` |

**Rule:** never use brand accent as a default series hue; pair colour with markers.

---

# 8. Chrome helpers (SX recipes)

| Helper | Purpose |
| --- | --- |
| `chromeIconSx` | 44px persistent chrome glyph button |
| `searchFieldSx` | List search field width |
| `layoutSx.*` | Shell / grid / list toolbar |
| `actionDockButtonSx(ink, opts?)` | Dock button glass recipe |
| `sectionDockChipSx(active)` | Section chip |
| `liquidGlassSpecimenSx(ink?)` | Specimen chip |

---

# 9. CSS chrome (`portal-chrome.scss`)

Custom properties: `--hcw-button-radius` · `--hcw-dock-pill-radius` · `--hcw-dialog-radius` · `--hcw-marketing-dock-radius` · `--hcw-accent` · `--hcw-accent-glow`.

Classes: `.hcw-action-dock` · `.hcw-action-dock-btn` · `.hcw-action-dock-divider` · `.hcw-section-dock-chip` · `.hcw-surface` · `.hcw-health-glass-orb` (+ `--{state}`).

---

# 10. Naming aliases

| HCW name | Export |
| --- | --- |
| KitRoot | `KitRoot` (also `MuiRoot`) |
| Theme factory | `createHcwTheme` (also `createAormsTheme`) |
| Default theme | `hcwTheme` (also `aormsTheme`) |

Prefer HCW names in new code and docs.

---

## Related

- Quality gate: [03-COMPONENT-QUALITY-CHECKLIST.md](03-COMPONENT-QUALITY-CHECKLIST.md)
- Templates: [05-TEMPLATES.md](05-TEMPLATES.md)
- Tokens law: [02-TOKEN-GOVERNANCE.md](02-TOKEN-GOVERNANCE.md)
- Visual specimen: [../styleguide.html](../styleguide.html)
