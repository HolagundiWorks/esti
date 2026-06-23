import { ArrowRight, Email } from "@carbon/icons-react";
import { Button, Stack } from "@carbon/react";
import { DEMO_ACCOUNTS } from "../../lib/landing-demo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingRecommended({
  onStudioDemo,
  onBetaScroll,
  demoKind,
}: {
  onStudioDemo: () => void;
  onBetaScroll: () => void;
  demoKind: "team" | null;
}) {
  const team = DEMO_ACCOUNTS.team;

  return (
    <LandingBand variant="contrast" id="recommended" ariaLabelledby="recommended-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="recommended-title"
            eyebrow="Recommended for you"
            title="Choose how you want to explore AORMS"
            lead="Open the seeded team workspace, or request a provisioned workspace for your firm."
          />
          <MarketingTileGrid columns={2}>
            <MarketingFeatureTile
              footer={
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={onStudioDemo}
                  disabled={demoKind === "team"}
                >
                  {demoKind === "team" ? "Opening…" : team.cta}
                </Button>
              }
            >
              <p className="esti-landing-eyebrow">Team mode</p>
              <h3 className="esti-landing-section-title">{team.title}</h3>
              <p>{team.subtitle}</p>
            </MarketingFeatureTile>
            <MarketingFeatureTile
              footer={
                <Button kind="tertiary" renderIcon={Email} onClick={onBetaScroll}>
                  Go to beta form
                </Button>
              }
            >
              <p className="esti-landing-eyebrow">Your firm</p>
              <h3 className="esti-landing-section-title">Request beta access</h3>
              <p>
                Tell us about your practice — we provision a workspace and walk you through
                modules that matter to you.
              </p>
            </MarketingFeatureTile>
          </MarketingTileGrid>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
