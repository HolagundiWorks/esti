import { Stack } from "@carbon/react";
import { LandingTrialForm } from "../LandingTrialForm.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

export function MarketingBetaBand() {
  return (
    <LandingBand variant="contrast" id="beta" ariaLabelledby="beta-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="beta-title"
            eyebrow="Beta access"
            title="Request a workspace for your practice"
            lead="We review each request and provision a firm instance — self-hosted on your VPS or ours."
          />
          <LandingTrialForm />
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
