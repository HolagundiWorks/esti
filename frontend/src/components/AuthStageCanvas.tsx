import { Box, Typography } from "@mui/material";
import { AORMS_STUDIO } from "../lib/product-nomenclature.js";
import { AormsLogo } from "./AormsLogo.js";
import { LandingContours } from "./landing/LandingContours.js";

export type AuthStageVariant = "workspace" | "portal" | "external" | "admin";

const COPY: Record<AuthStageVariant, { headline: string; subline: string }> = {
  workspace: {
    headline: AORMS_STUDIO.title,
    subline: `${AORMS_STUDIO.tagline} — projects, fees, drawings, and team on one record.`,
  },
  portal: {
    headline: "AORMS Account",
    subline: "Identity, companies, and licence — managed in one place.",
  },
  external: {
    headline: "Collaborator access",
    subline: "Client, contractor, and consultant portals.",
  },
  admin: {
    headline: "License Cloud",
    subline: "Platform administration for Human Centric Works.",
  },
};

/** Editorial stage canvas for auth screens — brand moment, no interactive fields. */
export function AuthStageCanvas({ variant = "workspace" }: { variant?: AuthStageVariant }) {
  const copy = COPY[variant];

  return (
    <Box className="esti-auth-stage">
      <LandingContours />
      <Box className="esti-auth-stage__copy">
        <AormsLogo variant="stage" />
        <Typography variant="h4" component="p" sx={{ fontWeight: 600, mt: 2, mb: 0 }}>
          {copy.headline}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: "28rem" }}>
          {copy.subline}
        </Typography>
      </Box>
    </Box>
  );
}
