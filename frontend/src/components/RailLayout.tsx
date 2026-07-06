import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Standard app screen shell — a 30 / 70 master-detail split used across every
 * menu-item screen.
 *
 *  - LEFT 30% (`esti-dash-rail`): a sticky, independently-scrolling rail carrying
 *    the screen heading + subtitle, an optional yellow-accent rule, then any
 *    `tabs` (vertical section nav) and `aside` (telemetry / filters / summary).
 *  - RIGHT 70%: the screen's primary content (`children`) — lists, tables, panels.
 *
 * Keeps every screen consistent: fixed heading/telemetry on the left, the changing
 * items on the right. Colour comes from the theme; no raw values here.
 */
export function RailLayout({
  title,
  description,
  actions,
  tabs,
  aside,
  children,
}: {
  title: string;
  description?: string;
  /** Rendered under the heading in the rail (e.g. module toggles, a create button). */
  actions?: ReactNode;
  /** Vertical section tabs in the rail (MUI `<Tabs orientation="vertical">`). */
  tabs?: ReactNode;
  /** Telemetry / filters / summary cards shown below the tabs in the rail. */
  aside?: ReactNode;
  /** The 70% content pane. */
  children: ReactNode;
}) {
  return (
    <Box className="esti-glass-dash">
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", width: 1 }}>
        {/* LEFT 30% — fixed rail */}
        <Box
          className="esti-dash-rail"
          sx={{
            flex: "0 0 20%",
            maxWidth: "20%",
            minWidth: 0,
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - 132px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pr: 0.5,
          }}
        >
          <Box sx={{ borderLeft: 3, borderLeftColor: "primary.main", pl: 1.5 }}>
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            )}
          </Box>
          {actions}
          {tabs}
          {aside}
        </Box>

        {/* RIGHT 70% — content */}
        <Box sx={{ flex: "1 1 70%", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
