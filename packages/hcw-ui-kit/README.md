# @hcw/ui-kit — HCW-UI-Kit

**HCW-UI-Kit** (*Human Centric Works UI Kit*) — the centralised, **layered** design
system deployed against **every** AORMS portal (workspace app, client & consultant
portals, licensing console, ESE, the Estimate app, any future deployable).

Thesis: **depth encodes importance** — three material languages stacked by z-depth:
**hyperminimalist (flat)** for information at rest, **neumorphic (soft)** for objects
you work within, **glassmorphism (glass)** for the live layer (hover, CTAs, the
action dock, alerts). Full spec + spatial model (Rail · Stage · TaskbarFooter ·
ActionDock): [`docs/esti/HCW-UI-KIT.md`](../../docs/esti/HCW-UI-KIT.md).

It is the ONE place raw brand values live. Change a token here and every portal
that mounts the kit updates together.

## What's in it

| Export | What |
|---|---|
| `colors`, `RADIUS`, `BUTTON_RADIUS`, `FONT_FAMILY`, `tokens`, surface recipes (`NEU_POP`, `FLAT_POP`, `NEU_INSET`, …) | **Design tokens** — the single source of truth (`tokens.ts`) |
| `aormsTheme`, `createAormsTheme()` | the shared **Material UI theme** built from the tokens (`theme.ts`) |
| `MuiRoot` | the **provider** — wrap a portal once; supplies theme + dayjs localization |
| `BrandMark` | asset-free **wordmark** primitive (accent square + uppercase wordmark) |

## Use it in a portal

```tsx
import { MuiRoot, BrandMark, colors } from "@esti/ui-kit";

root.render(
  <MuiRoot>
    <BrandMark label="AORMS Estimate" size="lg" />
    {/* every @mui/material surface below inherits the brand */}
    <App />
  </MuiRoot>,
);
```

Add it to the portal's `package.json` (`"@esti/ui-kit": "workspace:*"`), and import
the **brand font** once in the entry point (Urbanist, self-hosted, offline-safe):

```ts
import "@fontsource/urbanist/400.css";
import "@fontsource/urbanist/500.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
```

Layer portal-specific overrides while keeping 100% of the brand defaults:

```tsx
import { createAormsTheme, MuiRoot } from "@esti/ui-kit";
import { createTheme } from "@mui/material/styles";
const theme = createTheme(createAormsTheme(), { /* portal tweaks */ });
<MuiRoot theme={theme}>…</MuiRoot>;
```

## Peer dependencies

The kit is React + MUI based and declares peers (provided by the consuming
portal): `react`, `react-dom`, `@mui/material`, `@mui/x-data-grid`,
`@mui/x-date-pickers`, `@emotion/react`, `@emotion/styled`, `dayjs`.

## Source-only

Like `@esti/contracts`, this package ships TypeScript source (`main` →
`src/index.ts`); the consuming portal's bundler compiles it. No build step.

Full design spec: [`docs/esti/AORMS-BRANDING-KIT.md`](../../docs/esti/AORMS-BRANDING-KIT.md).
