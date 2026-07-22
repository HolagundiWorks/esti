# Token export — Figma Variables bridge

**Status:** Canonical · **Adopted:** 2026-07-22 · **Closes kit half of D16**  
**Source of truth:** `src/tokens.ts` (always). Export is a **bridge**, not a second authority.

## Artefacts (after `pnpm build`)

| Path | Use |
| --- | --- |
| `dist/tokens.json` | Tokens Studio / Figma Variables import (DTCG-ish) |
| `dist/tokens.css` | CSS custom properties per scheme (`data-hcw-scheme`) |
| `@hcw/ui-kit/token-export` | `buildTokenExport()` · `buildTokensJson()` · `buildTokensCss()` |

```bash
pnpm build          # tsc → copy scss → export tokens
pnpm export-tokens  # re-emit JSON/CSS if dist already built
```

## Figma import (Variables)

1. Install **Tokens Studio for Figma** (or equivalent DTCG importer).
2. Import `tokens.json` from the kit package / CI artefact.
3. Map collections:
   - `color.light` · `color.dark` · `color.highContrast` → Colour modes
   - `size.*` → Spacing / radius / density
   - `typography.*` → Font size / family
4. Do **not** treat the export as a component library — primitives stay in the kit + catalog.

## CSS usage

```css
@import "@hcw/ui-kit/tokens.css";
/* or link dist/tokens.css */

html[data-hcw-scheme="dark"] { /* switches --hcw-color-* */ }
```

KitRoot does not auto-set `data-hcw-scheme` on `<html>` — products set it when switching schemes.

## What is synced

Semantic colours (all schemes) · radii · spacing · type scale · density targets ·
layout chrome sizes · motion durations · capacity/interruption/COGA numbers ·
data-viz ladders · status shapes · breakpoints / z-index / opacity.

## What is not synced

- Component geometry beyond tokens (ActionDock capsule recipes as MUI `sx`)
- Pictogram SVG paths
- Product copy / i18n strings
- A Figma **component** library (DesignOps owns that file)

## Governance

Changing `src/tokens.ts` without regenerating export = defect (CI build always
re-exports). See [02-TOKEN-GOVERNANCE.md](02-TOKEN-GOVERNANCE.md).
