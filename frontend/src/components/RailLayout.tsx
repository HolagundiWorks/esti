import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Standard app screen shell — **Rail · Stage** split (canonical Studio Intelligence
 * geometry). Every authenticated screen using this component gets the glass rail
 * panel, fixed full-height rail (desktop), and an independently scrolling stage.
 *
 *  - **RAIL** (20%, `.esti-dash-rail`): heading · vertical tabs · telemetry · actions
 *  - **STAGE** (80%, `.esti-dash-stage`): primary work surface
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
  /** Action buttons — pinned to the bottom of the rail. Pass `fullWidth` buttons. */
  actions?: ReactNode;
  /** Vertical section tabs in the rail (MUI `<Tabs orientation="vertical">`). */
  tabs?: ReactNode;
  /** Telemetry / filters / summary below tabs in the rail. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      className="esti-glass-dash"
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          flex: 1,
          minHeight: 0,
          overflow: { xs: "visible", md: "hidden" },
          gap: 2,
          alignItems: "stretch",
          width: 1,
        }}
      >
        {/* Spacer reserves rail width while the rail is fixed (desktop). */}
        <Box
          aria-hidden
          className="esti-dash-rail-spacer"
          sx={{
            display: { xs: "none", md: "block" },
            flex: "0 0 20%",
            maxWidth: "20%",
            flexShrink: 0,
          }}
        />

        {/* ── RAIL (20%) ─────────────────────────────────────────────── */}
        <Box
          className="esti-dash-rail"
          sx={{
            flex: { xs: "0 0 auto", md: "0 0 20%" },
            maxWidth: { md: "20%" },
            minWidth: 0,
            width: { xs: "100%", md: "auto" },
            overflowY: { md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, width: 1 }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 600, lineHeight: 1.15, mt: 0, wordBreak: "break-word" }}
            >
              {title}
            </Typography>
            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, wordBreak: "break-word" }}
              >
                {description}
              </Typography>
            )}
          </Box>

          {tabs}
          {aside && (
            <Box sx={{ minWidth: 0, width: 1, flex: "1 1 auto", overflowY: "auto" }}>
              {aside}
            </Box>
          )}

          {actions && (
            <Box
              sx={{
                mt: { xs: 2, md: "auto" },
                pt: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {actions}
            </Box>
          )}
        </Box>

        {/* ── STAGE (80%) ────────────────────────────────────────────── */}
        <Box
          className="esti-dash-stage"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            height: { md: "100%" },
            overflowY: { md: "auto" },
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
