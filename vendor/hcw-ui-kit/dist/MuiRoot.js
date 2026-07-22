import { jsx as _jsx } from "react/jsx-runtime";
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
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { createContext, useContext, useMemo } from "react";
import { aormsTheme, createAormsTheme } from "./theme.js";
import { DEFAULT_LOCALE } from "./rtl.js";
export const HcwLocaleContext = createContext(DEFAULT_LOCALE);
export function useHcwLocale() {
    return useContext(HcwLocaleContext);
}
export function KitRoot({ children, theme, scheme, density, coga, direction = "ltr", locale = DEFAULT_LOCALE, }) {
    const resolved = useMemo(() => {
        if (theme)
            return theme;
        const s = scheme ?? "light";
        const d = density ?? "comfortable";
        const c = coga ?? "default";
        if (s === "light" && d === "comfortable" && c === "default" && direction === "ltr") {
            return aormsTheme;
        }
        return createAormsTheme({ scheme: s, density: d, coga: c, direction });
    }, [theme, scheme, density, coga, direction]);
    const cogaAttr = coga ?? "default";
    return (_jsx(StyledEngineProvider, { injectFirst: true, children: _jsx(ThemeProvider, { theme: resolved, children: _jsx(LocalizationProvider, { dateAdapter: AdapterDayjs, children: _jsx(HcwLocaleContext.Provider, { value: locale, children: _jsx("div", { "data-hcw-coga": cogaAttr, "data-hcw-direction": direction, dir: direction, lang: locale, style: { display: "contents" }, children: children }) }) }) }) }));
}
/** @deprecated Prefer {@link KitRoot}. */
export const MuiRoot = KitRoot;
export default KitRoot;
//# sourceMappingURL=MuiRoot.js.map