import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AuthStageCanvas, type AuthStageVariant } from "./AuthStageCanvas.js";

/**
 * Unauthenticated auth shell — **Rail · Stage** split (U2).
 * Forms and credentials live in the glass rail; the stage is editorial only.
 */
export function AuthRailLayout({
  rail,
  stage,
  variant = "workspace",
}: {
  /** Sign-in / recovery form content — rendered inside `.esti-dash-rail`. */
  rail: ReactNode;
  /** Optional custom stage; defaults to {@link AuthStageCanvas}. */
  stage?: ReactNode;
  variant?: AuthStageVariant;
}) {
  return (
    <div className="esti-auth-shell">
      <div className="esti-auth-blobs" aria-hidden>
        <div className="esti-auth-blob esti-auth-blob--a" />
        <div className="esti-auth-blob esti-auth-blob--b" />
        <div className="esti-auth-blob esti-auth-blob--c" />
      </div>

      <Box
        className="esti-glass-dash esti-auth-dash"
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

          <Box
            className="esti-dash-rail esti-auth-rail"
            sx={{
              flex: { xs: "0 0 auto", md: "0 0 20%" },
              maxWidth: { md: "20%" },
              minWidth: 0,
              width: { xs: "100%", md: "auto" },
              overflowY: { md: "auto" },
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, width: 1 }}>{rail}</Box>
          </Box>

          <Box
            className="esti-dash-stage esti-auth-stage-wrap"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: { md: "100%" },
              overflowY: { md: "auto" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            {stage ?? <AuthStageCanvas variant={variant} />}
          </Box>
        </Box>
      </Box>
    </div>
  );
}
