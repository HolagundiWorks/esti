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
  /** Action buttons — pinned to the BOTTOM of the rail in a 3-per-row grid (each
   *  button is 1/3 of the rail width). Pass `fullWidth` buttons. */
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
      {/* On mobile the Rail stacks first, full width; the Stage follows below. */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "flex-start",
          width: 1,
        }}
      >
        {/* RAIL (20% on desktop, full width first on mobile) */}
        <Box
          className="esti-dash-rail"
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 20%" },
            width: { xs: 1, md: "auto" },
            maxWidth: { xs: "100%", md: "20%" },
            minWidth: 0,
            position: { xs: "static", md: "sticky" },
            top: 0,
            alignSelf: "flex-start",
            maxHeight: { xs: "none", md: "calc(100vh - 132px)" },
            overflowY: { xs: "visible", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pr: { xs: 0, md: 0.5 },
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
          {tabs}
          {aside}
          {/* Action buttons — pinned to the rail bottom, 3 per row (each 1/3 wide). */}
          {actions && (
            <Box
              sx={{
                mt: { xs: 2, md: "auto" },
                pt: 1.5,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                alignContent: "end",
              }}
            >
              {actions}
            </Box>
          )}
        </Box>

        {/* STAGE (80% on desktop, full width below the rail on mobile) */}
        <Box
          className="esti-dash-stage"
          sx={{
            flex: { xs: "1 1 auto", md: "1 1 80%" },
            width: { xs: 1, md: "auto" },
            maxWidth: { xs: "100%", md: "80%" },
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
