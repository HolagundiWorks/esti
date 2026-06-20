import { Column, Grid, ListItem, Stack, UnorderedList } from "@carbon/react";
import { LandingCarbonZone } from "../LandingCarbonZone.js";
import { LandingActionCenterPreview } from "./LandingActionCenterPreview.js";
import { LandingActivityPreview } from "./LandingActivityPreview.js";
import { TRACEABILITY_PRINCIPLES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";

export function MarketingTraceabilityBand() {
  return (
    <MarketingBandSection
      id="traceability"
      variant="muted"
      eyebrow="Product promise"
      title="Every important change has a source."
      lead="Operational communication, approvals, and financial mutations stay linked to the project object that created them — the same Activity Center and Action Center tiles you use on the office dashboard."
    >
      <Grid fullWidth className="esti-landing-grid">
        <Column sm={4} md={8} lg={5}>
          <Stack gap={5}>
            <p className="esti-landing-eyebrow">Principles</p>
            <UnorderedList>
              {TRACEABILITY_PRINCIPLES.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </UnorderedList>
          </Stack>
        </Column>
        <Column sm={4} md={8} lg={11}>
          <LandingCarbonZone wide>
            <Stack gap={6}>
              <LandingActivityPreview />
              <LandingActionCenterPreview />
            </Stack>
          </LandingCarbonZone>
        </Column>
      </Grid>
    </MarketingBandSection>
  );
}
