import { Column, Grid, ListItem, Stack, UnorderedList } from "@carbon/react";
import { CHARTER_BUILDS, CHARTER_REJECTS } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";

export function MarketingCharterBand() {
  return (
    <MarketingBandSection
      id="charter"
      variant="muted"
      eyebrow="Product charter"
      title="What ESTI deliberately is not."
      lead="Clear boundaries protect your practice from scope creep — and protect the product from becoming a generic construction ERP."
    >
      <Grid fullWidth className="esti-landing-grid">
        <Column sm={4} md={4} lg={8}>
          <Stack gap={5}>
            <p className="esti-landing-eyebrow">Out of scope</p>
            <UnorderedList>
              {CHARTER_REJECTS.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </UnorderedList>
          </Stack>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <Stack gap={5}>
            <p className="esti-landing-eyebrow">What we build instead</p>
            <UnorderedList>
              {CHARTER_BUILDS.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </UnorderedList>
          </Stack>
        </Column>
      </Grid>
    </MarketingBandSection>
  );
}
