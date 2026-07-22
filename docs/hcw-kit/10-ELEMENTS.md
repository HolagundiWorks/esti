# HCW Elements

**Superseded as the primary inventory** by [14-HCW-CATALOG.md](14-HCW-CATALOG.md)
(§ Elements · Components · Patterns · Pictograms · Icons).

This file keeps a compact **element cheat-sheet** — themed controls and kit
primitives with attributes only. No external-system framing.

## Kit primitives (import from `@hcw/ui-kit`)

| Element | Key attributes |
| --- | --- |
| KitRoot | `scheme` · `density` · `theme?` · `children` |
| Surface | `layer`: flat · soft · glass · clearGlass · headingGlass |
| GlassRail | `rail` · `children` · `glass`: frost · clear |
| ActionDock | zones via `DockAction.zone` left · center · right |
| SectionDock | `links[]` · `pathname` · `hash?` |
| TaskbarFooter | `left` · `center` · `right` · `showClock?` |
| TaskbarButton | `icon` · `label` · `active?` · `onClick?` |
| BrandMark | `label` · `size` sm\|md\|lg · `accent` · `accentShape` auto\|a\|square |
| StatusDot | `label` · `color` · `size` sm\|md |
| HealthGlassOrb | `state` · `variant` flat\|glass · `size?` · `title?` |
| Avatar | `name` · `photoUrl?` · `color?` · `size` xs…xl |
| PageBreadcrumb | `items` · `linkComponent?` · `linkPropName` href\|to |
| DataState | `loading` · `isEmpty` · `empty` · `children` |
| ConfirmModal | `open` · `heading` · `body` · `confirmText` · `danger` · `pending` |
| ToastHost / pushToast | `kind` · `title` · `subtitle?` |

## Themed elements (via KitRoot theme)

| Element | Attributes / rules |
| --- | --- |
| Action | glass-hover CTA; danger tone; page CTAs → ActionDock |
| Glyph action | `chromeIconSx` in persistent chrome (≥44) |
| Toggle | selected = accent wash |
| Field | neumorphic well; search → `searchFieldSx` |
| Choice | accent when active; focus ring |
| Chip | square; **status → StatusDot** |
| Tooltip | ink slab |
| Alert | standard glass (error/warning) · filled solid (toasts) |
| Dialog | neu pop; destroy → ConfirmModal; `aria-labelledby` |
| Tabs | inset top accent rule |
| Link | slate, never accent |
| Table / grid | density row heights; accent selection |
| List | selected layer02; `layoutSx.listToolbar` |
| Pagination / Stepper / Calendar | accent active |
| Chart | `chartPalette` · markers · `chartRootSx` |

## Pictograms & icons

See catalog §5–6. Registry: `PICTOGRAM` · `ICON` · `CHART_MARKERS` · `HEALTH_PICTOGRAM`.
