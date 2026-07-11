# @hcw/ui-kit — HCW-UI-Kit

**HCW-UI-Kit** (*Human Centric Works UI Kit*) — the centralised, **layered** design
system for every AORMS surface: workspace app, client/consultant/site portals,
licensing console, marketing site chrome (via shared primitives), and future apps.

Thesis: **depth encodes importance** — flat (info) · soft (objects) · glass (action).
Full spatial model + marketing rules:
[`docs/esti/HCW-UI-KIT.md`](../../docs/esti/HCW-UI-KIT.md).
UX principles (laws, a11y, checklist):
[`docs/esti/HCW-UI-UX-PRINCIPLES.md`](../../docs/esti/HCW-UI-UX-PRINCIPLES.md).

## Exports

| Export | Role |
|--------|------|
| `colors`, `RADIUS` (0), `BUTTON_RADIUS` (4), `DOCK_PILL_RADIUS` (capsule), `ACTION_DOCK_TRAY`, `DIALOG_RADIUS` (8), `FONT_FAMILY`, `tokens`, `LAYERS`, … | Design tokens |
| `actionDockButtonSx`, `sectionDockChipSx`, `liquidGlassSpecimenSx` | Shared chrome `sx` — import instead of copying CSS |
| `@hcw/ui-kit/portal-chrome.scss` | Portal-wide ActionDock capsule + dialog classes — import once in app entry |
| `aormsTheme`, `createAormsTheme()` | Shared MUI theme |
| `MuiRoot` | Theme + dayjs provider |
| `Surface` | `layer="flat\|soft\|glass\|clearGlass\|headingGlass"` |
| `GlassRail` | Rail · stage shell (`glass="frost\|clear"`) |
| `HealthGlassOrb` | Zone / office-health indicator |
| `ActionDock`, `ActionDockProvider`, `useScreenActions` | Global 3-zone CTAs |
| `SectionDock` | Marketing section carousel dock |
| `TaskbarFooter`, `TaskbarButton`, `TASKBAR_HEIGHT` | Footer shell (`left` · `center` · `right`) |
| `BrandMark` | Asset-free wordmark |

## Mount

```tsx
import {
  MuiRoot,
  ActionDockProvider,
  ActionDock,
  TaskbarFooter,
  GlassRail,
  Surface,
  useScreenActions,
} from "@hcw/ui-kit";

<MuiRoot>
  <ActionDockProvider>
    <GlassRail rail={<>…nav…</>}>
      <Surface layer="soft" sx={{ p: 2 }}>…</Surface>
    </GlassRail>
    <ActionDock />
    <TaskbarFooter left={…} center={…} right={…} />
  </ActionDockProvider>
</MuiRoot>
```

```json
"@hcw/ui-kit": "workspace:*"
```

Brand font (once per app entry):

```ts
import "@fontsource/urbanist/400.css";
import "@fontsource/urbanist/500.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
import "@hcw/ui-kit/portal-chrome.scss";
```

## Redesign rule

Change shared chrome in **this package** (`tokens.ts` → `chrome-sx.ts` →
component → `portal-chrome.scss`). App screens import kit primitives; they do
not own glass/radius recipes. See `docs/esti/HCW-UI-KIT.md` § Redesign workflow.

## Layer pick (quick)

| Need | Layer |
|------|--------|
| Table, body copy, list | `flat` |
| Dialog, summary card, panel | `soft` |
| Dock, alert, active widget | `glass` |
| Marketing / translucent rail | `clearGlass` |
| Full-width section heading band | `headingGlass` |

**Marketing sub-cards stay flat** (no glass) so contour atmosphere stays sharp —
see HCW-UI-KIT.md § Glass hierarchy.

## Peers

`react`, `react-dom`, `@mui/material`, `@mui/x-data-grid`, `@mui/x-date-pickers`,
`@emotion/react`, `@emotion/styled`, `dayjs`.

## Source-only

Ships TypeScript source (`main` → `src/index.ts`); the consumer bundler compiles it.

Brand heritage: [`docs/esti/AORMS-BRANDING-KIT.md`](../../docs/esti/AORMS-BRANDING-KIT.md).
