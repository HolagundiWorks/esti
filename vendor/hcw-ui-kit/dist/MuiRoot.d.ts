/**
 * KitRoot — mounts the shared HCW theme for a portal.
 *
 * Wrap a portal's tree in this once and every themed surface inherits the brand
 * (colour, shape, surfaces, type). It supplies the theme *context* only and
 * injects no page-level background.
 *
 * `scheme` + `density` + `coga` + `direction` feed `createHcwTheme` when `theme`
 * is omitted. Export aliases: `KitRoot` (preferred) · `MuiRoot` (legacy name).
 *
 * RTL: set `direction="rtl"` and wrap with Emotion CacheProvider using
 * {@link createHcwRtlCacheOptions} (see docs/hcw-kit/13-ROADMAPS.md).
 */
import { type Theme } from "@mui/material/styles";
import { type ReactNode } from "react";
import { type TextDirection } from "./rtl.js";
import type { CogaMode, DensityName, SchemeName } from "./tokens.js";
export declare const HcwLocaleContext: import("react").Context<string>;
export declare function useHcwLocale(): string;
export declare function KitRoot({ children, theme, scheme, density, coga, direction, locale, }: {
    children: ReactNode;
    /** Full theme override — wins over scheme / density / coga / direction. */
    theme?: Theme;
    /** Colour scheme (light default; dark/highContrast are preview-grade). */
    scheme?: SchemeName;
    /** Control density — comfortable (default) or compact. */
    density?: DensityName;
    /** COGA calm mode — larger targets + one type step (default: `"default"`). */
    coga?: CogaMode;
    /** Text direction — sets `theme.direction` + `dir` on the kit wrapper. */
    direction?: TextDirection;
    /** BCP 47 locale for clock / consumer i18n (default `en-IN`). */
    locale?: string;
}): import("react").JSX.Element;
/** @deprecated Prefer {@link KitRoot}. */
export declare const MuiRoot: typeof KitRoot;
export default KitRoot;
//# sourceMappingURL=MuiRoot.d.ts.map