import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Column, Grid, ListItem, Stack, UnorderedList } from "@carbon/react";
import type { DemoKind } from "../../lib/landing-demo.js";
import { LandingDashboardPreview } from "../LandingDashboardPreview.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const RESOLVERS = [
  "Every scope change documented before work begins — no revision disputes",
  "Fee proposals, GST invoices, and TDS reconciliation in the project record",
  "Clients get a scoped portal — drawings, approvals, and change requests",
] as const;

export function MarketingHero({
  onStudioDemo,
  onSoloDemo,
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
    <LandingBand
      variant="default"
      id="top"
      ariaLabelledby="hero-title"
      className="esti-landing-hero-full"
    >
      <LandingEditorial>
        <Grid fullWidth className="esti-landing-grid">
          {/* Centered text block */}
          <Column lg={{ span: 8, offset: 4 }} md={8} sm={4}>
            <Stack gap={8} className="esti-lp-hero-center">
              <Stack gap={5}>
                <p className="esti-landing-eyebrow">For Indian architecture practices</p>
                <h1 id="hero-title" className="esti-landing-lead-title">
                  Run your practice, not your inbox.
                </h1>
                <p className="esti-landing-lead-subtitle">
                  From the first client call to the final invoice — projects,
                  drawings, fees, compliance, and portals in one place.
                </p>
              </Stack>

              <UnorderedList className="esti-landing-icon-list">
                {RESOLVERS.map((r) => (
                  <ListItem key={r}>
                    <span className="esti-row">
                      <Checkmark size={16} aria-hidden />
                      <span>{r}</span>
                    </span>
                  </ListItem>
                ))}
              </UnorderedList>

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
                  <Button kind="tertiary" size="lg" onClick={onTrialScroll}>
                    Request trial
                  </Button>
                )}
              </Stack>
            </Stack>
          </Column>

          {/* Full-width product screenshot */}
          <Column lg={{ span: 14, offset: 1 }} md={8} sm={4}>
            <div className="esti-lp-hero-preview-stage">
              <LandingDashboardPreview />
            </div>
          </Column>
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
