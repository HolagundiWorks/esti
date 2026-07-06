import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Standard app screen shell — the **Rail / Stage** split used across screens.
 *
 * Nomenclature (canonical — use these terms everywhere):
 *  - **RAIL** (20%, `esti-dash-rail`): the fixed info column — heading + subtitle,
 *    optional yellow-accent rule, `tabs` (section nav) and `aside` (telemetry /
 *    filters / summary).
 *  - **STAGE** (80%, `esti-dash-stage`): the changing primary content
 *    (`children`) — lists, tables, panels.
 *
 * Keeps every screen consistent: fixed instruments on the Rail, the changing
 * items on the Stage. Colour comes from the theme; no raw values here.
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

        {/* STAGE (80%) — content */}
        <Box className="esti-dash-stage" sx={{ flex: "1 1 80%", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
