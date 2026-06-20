import { Button, Column, Grid, Stack } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { LandingDashboardPreview } from "../LandingDashboardPreview.js";
import { LandingCarbonZone } from "../LandingCarbonZone.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

export function MarketingRecordHero({
  onStudioDemo,
  onTrialScroll,
  demoLoading,
}: {
  onStudioDemo: () => void;
  onTrialScroll: () => void;
  demoLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <LandingBand variant="lead" id="record" ariaLabelledby="hero-title">
      <LandingEditorial>
        <Grid fullWidth className="esti-landing-grid esti-landing-hero-grid">
          <Column sm={4} md={8} lg={10}>
            <Stack gap={7}>
              <Stack gap={5}>
                <p className="esti-landing-eyebrow">Architectural Office Resource Management</p>
                <h1 id="hero-title" className="esti-landing-lead-title">
                  The office record your projects deserve.
                </h1>
                <p className="esti-landing-section-lead">
                  One operational system for projects, drawings, fees, compliance evidence,
                  tenders, and coordination — linked to the object that created them.
                </p>
              </Stack>
              <Stack orientation="horizontal" gap={5} className="esti-landing-hero-actions">
                <Button onClick={onTrialScroll}>Request trial</Button>
                <Button kind="secondary" onClick={onStudioDemo} disabled={demoLoading}>
                  {demoLoading ? "Opening demo…" : "Enter studio demo"}
                </Button>
                <Button kind="tertiary" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              </Stack>
            </Stack>
          </Column>
          <Column sm={4} md={8} lg={6}>
            <LandingCarbonZone wide>
              <LandingDashboardPreview />
            </LandingCarbonZone>
          </Column>
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
