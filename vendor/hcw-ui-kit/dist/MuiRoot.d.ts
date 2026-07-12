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
import { type Theme } from "@mui/material/styles";
import { type ReactNode } from "react";
import type { SchemeName } from "./tokens.js";
export declare function MuiRoot({ children, theme, scheme, }: {
    children: ReactNode;
    /** Full theme override — wins over `scheme`. */
    theme?: Theme;
    /** Colour scheme (light default; dark/highContrast are preview-grade). */
    scheme?: SchemeName;
}): import("react").JSX.Element;
export default MuiRoot;
//# sourceMappingURL=MuiRoot.d.ts.map