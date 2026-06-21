import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Column, Grid, Stack, Tag, Theme } from "@carbon/react";
import type { DemoKind } from "../../lib/landing-demo.js";
import { LandingDashboardPreview } from "../LandingDashboardPreview.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingTopoBackground } from "./MarketingTopoBackground.js";

const RESOLVERS = [
  "Every scope change documented before work begins — no revision disputes",
  "Fee proposals, GST invoices, and TDS reconciliation in the project record",
  "Clients get a scoped portal — drawings, approvals, and change requests",
] as const;

export function MarketingHero({
  onStudioDemo,
  onTrialScroll,
  demoLoading,
  demoKind,
}: {
  onStudioDemo: () => void;
  onSoloDemo?: () => void;
  onTrialScroll?: () => void;
  demoLoading: boolean;
  demoKind?: DemoKind | null;
}) {
  return (
    <Theme theme="g100">
      <LandingBand
        variant="lead"
        id="top"
        ariaLabelledby="hero-title"
        className="esti-landing-hero-topo"
      >
        <MarketingTopoBackground />

        <LandingEditorial>
          <Grid fullWidth className="esti-landing-grid">
            <Column lg={{ span: 7, offset: 1 }} md={8} sm={4}>
              <Stack gap={8} className="esti-lp-hero-center">
                <Stack gap={5}>
                  <Tag type="purple" size="md">For Indian architecture practices</Tag>
                  <h1 id="hero-title" className="esti-landing-lead-title">
                    Run your practice,<br />not your inbox.
                  </h1>
                  <p className="esti-landing-lead-subtitle">
                    From the first client call to the final invoice — projects,
                    drawings, fees, compliance, and portals in one place.
                  </p>
                </Stack>

                <Stack gap={3} className="esti-lp-hero-resolvers">
                  {RESOLVERS.map((r) => (
                    <span key={r} className="esti-row esti-lp-hero-resolver">
                      <Checkmark size={16} aria-hidden />
                      <span>{r}</span>
                    </span>
                  ))}
                </Stack>

                <Stack orientation="horizontal" gap={4} className="esti-landing-hero-actions">
                  <Button
                    kind="primary"
                    size="lg"
                    renderIcon={ArrowRight}
                    onClick={onStudioDemo}
                    disabled={demoLoading}
                  >
                    {demoLoading && demoKind === "studio" ? "Opening…" : "Explore studio demo"}
                  </Button>
                  {onTrialScroll && (
                    <Button kind="ghost" size="lg" onClick={onTrialScroll}>
                      Request trial
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Column>

            <Column lg={{ span: 8, offset: 0 }} md={8} sm={4}>
              <div className="esti-lp-hero-preview-stage">
                <LandingDashboardPreview />
              </div>
            </Column>
          </Grid>
        </LandingEditorial>
      </LandingBand>
    </Theme>
  );
}
