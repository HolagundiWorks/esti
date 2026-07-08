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
import { StyledEngineProvider, ThemeProvider, type Theme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { ReactNode } from "react";
import { aormsTheme } from "./theme.js";

export function MuiRoot({ children, theme = aormsTheme }: { children: ReactNode; theme?: Theme }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default MuiRoot;
