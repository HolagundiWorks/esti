import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { HcwAttribution } from "./brand/HcwAttribution.js";
import { MarketingFooter } from "./landing/MarketingFooter.js";
import { AuthStageCanvas, type AuthStageVariant } from "./AuthStageCanvas.js";

/**
 * Unauthenticated auth shell — **Rail · Stage** split (U2).
 * Forms and credentials live in the glass rail; the stage is editorial only.
 */
export function AuthRailLayout({
  rail,
  stage,
  variant = "workspace",
  showMarketingFooter = true,
  footerVariant = "architecture",
  visitCount,
}: {
  /** Sign-in / recovery form content — rendered inside `.esti-dash-rail`. */
  rail: ReactNode;
  /** Optional custom stage; defaults to {@link AuthStageCanvas}. */
  stage?: ReactNode;
  variant?: AuthStageVariant;
  /** Sitewide orange glass footer below the stage scroll (non-portal public pages). */
  showMarketingFooter?: boolean;
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
}) {
  return (
    <div className="esti-auth-shell">
      <a href="#esti-auth-main" className="esti-skip-link">
        Skip to main content
      </a>
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
          overflow: { xs: "visible", md: "hidden" },
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
              overflowY: { xs: "visible", md: "auto" },
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, width: 1, flex: 1 }}>{rail}</Box>
            <HcwAttribution variant="auth" />
          </Box>

          <Box
            className="esti-dash-stage esti-auth-stage-wrap"
            id="esti-auth-main"
            tabIndex={-1}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: { md: "100%" },
              overflowY: { xs: "visible", md: "auto" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            {stage ?? <AuthStageCanvas variant={variant} />}
            {showMarketingFooter ? (
              <MarketingFooter visitCount={visitCount} variant={footerVariant} />
            ) : null}
          </Box>
        </Box>
      </Box>
    </div>
  );
}
