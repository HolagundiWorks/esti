/**
 * MuiRoot — mounts the Material UI theme context for the whole app.
 *
 * During the Carbon → MUI migration both systems coexist (strangler pattern):
 * this provider only supplies MUI's theme *context* and injects no page-level
 * background, so screens still on Carbon are untouched and the landing page
 * (pure Carbon, never renders MUI components) is unaffected.
 *
 * `StyledEngineProvider injectFirst` puts MUI/emotion styles at the top of
 * <head> so our own app CSS (styles.scss, glass.scss) still wins on cascade.
 * We deliberately do NOT render a global <CssBaseline> — it would repaint the
 * landing body; the dark ambient backdrop is applied per-shell in SCSS instead.
 *
 * `LocalizationProvider` (dayjs) is mounted here so MUI X Date Pickers work
 * anywhere without per-screen setup.
 */
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { ReactNode } from "react";
import { muiTheme } from "./muiTheme.js";

export function MuiRoot({ children }: { children: ReactNode }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default MuiRoot;
