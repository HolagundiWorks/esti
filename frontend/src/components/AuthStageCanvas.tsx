import { Box, Typography } from "@mui/material";
import { AORMS_PORTALS, AORMS_STUDIO } from "../lib/product-nomenclature.js";
import { AormsLogo } from "./AormsLogo.js";
import { LandingContours } from "./landing/LandingContours.js";

export type AuthStageVariant = "workspace" | "portal" | "external" | "admin";

const COPY: Record<AuthStageVariant, { headline: string; subline: string }> = {
  workspace: {
    headline: AORMS_STUDIO.title,
    subline: `${AORMS_STUDIO.tagline} — projects, fees, drawings, and team on one record.`,
  },
  portal: {
    headline: AORMS_PORTALS.account.stageHeadline,
    subline: AORMS_PORTALS.account.stageSubline,
  },
  external: {
    headline: AORMS_PORTALS.external.stageHeadline,
    subline: AORMS_PORTALS.external.authTagline,
  },
  admin: {
    headline: AORMS_PORTALS.auth.licensingHeadline,
    subline: AORMS_PORTALS.auth.licensingSubline,
  },
};

/** Editorial stage canvas for auth screens — brand moment, no interactive fields. */
export function AuthStageCanvas({ variant = "workspace" }: { variant?: AuthStageVariant }) {
  const copy = COPY[variant];

  return (
    <Box className="esti-auth-stage" aria-hidden>
      <LandingContours />
      <Box className="esti-auth-stage__inner">
        <AormsLogo variant="hero" />
        <Typography variant="h4" component="p" className="esti-auth-stage__headline">
          {copy.headline}
        </Typography>
        <Typography variant="body1" component="p" className="esti-auth-stage__subline">
          {copy.subline}
        </Typography>
      </Box>
    </Box>
  );
}
