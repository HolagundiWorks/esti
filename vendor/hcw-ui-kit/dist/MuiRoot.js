import { jsx as _jsx } from "react/jsx-runtime";
/**
 * MuiRoot — mounts the shared AORMS Material UI theme for a portal.
 *
 * Wrap a portal's tree in this once and every MUI surface inherits the brand
 * (colour, shape, surfaces, type). It supplies the theme *context* only and
 * injects no page-level background, so surfaces still on Carbon are untouched and
 * a mixed Carbon/MUI shell keeps working (strangler-friendly).
 *
 * `StyledEngineProvider injectFirst` puts MUI/emotion styles at the top of <head>
 * so app CSS still wins on the cascade. `LocalizationProvider` (dayjs) is mounted
 * here so MUI X Date Pickers work anywhere with no per-screen setup.
 *
 * Pass a `theme` to layer portal-specific overrides on top of the brand defaults.
 */
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useMemo } from "react";
import { aormsTheme, createAormsTheme } from "./theme.js";
export function MuiRoot({ children, theme, scheme, }) {
    const resolved = useMemo(() => theme ?? (scheme && scheme !== "light" ? createAormsTheme({ scheme }) : aormsTheme), [theme, scheme]);
    return (_jsx(StyledEngineProvider, { injectFirst: true, children: _jsx(ThemeProvider, { theme: resolved, children: _jsx(LocalizationProvider, { dateAdapter: AdapterDayjs, children: children }) }) }));
}
export default MuiRoot;
//# sourceMappingURL=MuiRoot.js.map