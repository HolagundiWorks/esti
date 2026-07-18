import LogoutIcon from "@mui/icons-material/Logout";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { GlassRail } from "@hcw/ui-kit";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

/**
 * Client / consultant / site external portals — glass rail · stage
 * (kit `GlassRail`; same spatial model as AuthRailLayout and account PortalShell).
 */
export function ExternalPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <a href="#esti-main" className="esti-skip-link">
        Skip to main content
      </a>
      <GlassRail
      railAriaLabel={`${portalLabel} navigation`}
      rail={
        <Stack spacing={2} sx={{ height: "100%", minHeight: "12rem" }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {portalLabel}
            </Typography>
            <Typography variant="h6" component="p" sx={{ m: 0, fontWeight: 700 }}>
              {companyName ?? AORMS_PORTALS.studio.railFallback}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
          {onSignOut && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              disabled={signingOut}
              onClick={() => {
                if (!signingOut) onSignOut();
              }}
              sx={{ alignSelf: "stretch", minHeight: 44 }}
            >
              Sign out
            </Button>
          )}
        </Stack>
      }
    >
      {children}
    </GlassRail>
    </>
  );
}
