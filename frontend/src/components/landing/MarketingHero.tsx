import { ArrowRight, Login } from "@carbon/icons-react";
import { Button, Column, Grid, Stack } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

const STARTING_POINTS = [
  {
    title: "Dashboard Action Center",
    body: "Billing, approvals, and site coordination on one command surface.",
  },
  {
    title: "CRIF revision register",
    body: "Transparent client change control with decision memory.",
  },
  {
    title: "ESTICAD companion",
    body: "Desktop takeoff quantities into project BOQ and Estimates.",
  },
] as const;

export function MarketingHero({
  onStudioDemo,
  demoLoading,
}: {
  onStudioDemo: () => void;
  demoLoading: boolean;
}) {
  return (
    <LandingBand variant="lead" id="top" ariaLabelledby="hero-title">
      <LandingEditorial>
        <Grid fullWidth className="esti-landing-grid esti-landing-hero-grid">
          <Column lg={8} md={4} sm={4}>
            <Stack gap={7}>
              <Stack gap={5}>
                <p className="esti-landing-eyebrow">Architecture Office Record &amp; Management</p>
                <h1 id="hero-title" className="esti-landing-lead-title">
                  One traceable office record for Indian practices
                </h1>
                <p className="esti-landing-lead-subtitle">
                  From enquiry to final bill — projects, drawings, revisions, fees, GST, and
                  portals in a single self-hosted system.
                </p>
                <p className="esti-landing-section-lead">
                  AORMS keeps every decision, issue, and invoice linked to its project. Built for
                  solo architects and small studios — not a general ERP, not a CAD replacement.
                </p>
              </Stack>
              <Stack orientation="horizontal" gap={5}>
                <Button
                  kind="primary"
                  size="lg"
                  renderIcon={ArrowRight}
                  onClick={onStudioDemo}
                  disabled={demoLoading}
                >
                  {demoLoading ? "Opening demo…" : "Explore live studio demo"}
                </Button>
                <Button kind="secondary" size="lg" renderIcon={Login} href="/login">
                  Sign in
                </Button>
              </Stack>
            </Stack>
          </Column>
          <Column lg={8} md={4} sm={4}>
            <Stack gap={7}>
              <p className="esti-landing-eyebrow">Recommended starting points</p>
              <MarketingTileGrid columns={1}>
                {STARTING_POINTS.map((point) => (
                  <MarketingFeatureTile key={point.title}>
                    <h3 className="esti-landing-section-title">{point.title}</h3>
                    <p>{point.body}</p>
                  </MarketingFeatureTile>
                ))}
              </MarketingTileGrid>
            </Stack>
          </Column>
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
