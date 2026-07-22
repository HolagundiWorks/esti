/**
 * AORMS Material UI theme — the single source of colour + shape for every MUI
 * portal. Built entirely from the shared design tokens (`tokens.ts`) so the look
 * is identical everywhere it is mounted.
 *
 * The HCW-UI-Kit layer rules, encoded here so screens inherit them and never
 * re-specify them inline (full spec: docs/esti/HCW-UI-KIT.md):
 *  1. Layer 1 FLAT (hyperminimalist) — tables, text, surfaces at rest; square
 *     corners (0 radius). Rounded corners: buttons 4px, dialogs 8px.
 *  2. Layer 2 SOFT (neumorphic) — dialogs and text-entry wells; objects you work
 *     within.
 *  3. Layer 3 GLASS (glassmorphism) — the live layer: BUTTON HOVER takes the
 *     glass slab, and priority alerts (error/warning) read as tinted glass.
 *
 * MUI is the rendering engine; HCW owns appearance and patterns
 * (see `LAYOUT` · `SPACING` · `DENSITY` · catalog).
 */
import { type Theme } from "@mui/material/styles";
import { type SchemeName, type DensityName, type CogaMode } from "./tokens.js";
import type { TextDirection } from "./rtl.js";
/** Build the AORMS MUI theme. Exposed as a factory so a portal can layer small
 *  overrides on top if it must, while sharing 100% of the brand defaults.
 *
 *  `scheme` selects the semantic colour scheme (default `"light"` — the shipped
 *  brand). `"dark"` / `"highContrast"` are palette-complete SCAFFOLDS: the
 *  neumorphic/glass recipes remain light-tuned until they gain scheme variants,
 *  so treat non-light schemes as preview-grade (see tokens.ts § Colour schemes).
 *
 *  `density` selects comfortable (default) or compact control heights.
 *  `coga: "calm"` raises interactive floors and bumps caption/body type one step.
 *  `direction` sets MUI `theme.direction` for RTL-ready chrome. */
export declare function createAormsTheme(options?: {
    scheme?: SchemeName;
    density?: DensityName;
    coga?: CogaMode;
    direction?: TextDirection;
}): Theme;
/** The shared, ready-to-use AORMS theme instance. */
export declare const aormsTheme: Theme;
/** HCW name for {@link aormsTheme}. Prefer this in new code. */
export declare const hcwTheme: Theme;
/** HCW name for {@link createAormsTheme}. Prefer this in new code. */
export declare const createHcwTheme: typeof createAormsTheme;
export default aormsTheme;
//# sourceMappingURL=theme.d.ts.map