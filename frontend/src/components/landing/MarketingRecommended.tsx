import { ArrowRight, Email } from "@carbon/icons-react";
import { Button, Stack } from "@carbon/react";
import { DEMO_ACCOUNTS } from "../../lib/landing-demo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingRecommended({
  onStudioDemo,
  onSoloDemo,
  onBetaScroll,
  demoKind,
}: {
  onStudioDemo: () => void;
  onSoloDemo: () => void;
  onBetaScroll: () => void;
  demoKind: "solo" | "studio" | null;
}) {
  const studio = DEMO_ACCOUNTS.studio;
  const solo = DEMO_ACCOUNTS.solo;

  return (
    <LandingBand variant="contrast" id="recommended" ariaLabelledby="recommended-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="recommended-title"
            eyebrow="Recommended for you"
            title="Choose how you want to explore AORMS"
            lead="Each path opens a seeded workspace — studio scale, solo practice, or a conversation with our team."
          />
          <MarketingTileGrid columns={3}>
            <MarketingFeatureTile
              footer={
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={onStudioDemo}
                  disabled={demoKind === "studio"}
                >
                  {demoKind === "studio" ? "Opening…" : studio.cta}
                </Button>
              }
            >
              <p className="esti-landing-eyebrow">Studio</p>
              <h3 className="esti-landing-section-title">{studio.title}</h3>
              <p>{studio.subtitle}</p>
            </MarketingFeatureTile>
            <MarketingFeatureTile
              footer={
                <Button
                  kind="secondary"
                  renderIcon={ArrowRight}
                  onClick={onSoloDemo}
                  disabled={demoKind === "solo"}
                >
                  {demoKind === "solo" ? "Opening…" : solo.cta}
                </Button>
              }
            >
              <p className="esti-landing-eyebrow">Solo</p>
              <h3 className="esti-landing-section-title">{solo.title}</h3>
              <p>{solo.subtitle}</p>
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
