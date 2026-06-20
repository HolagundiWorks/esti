import { InlineNotification, Stack, Tag } from "@carbon/react";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingKnowledgeBand() {
  return (
    <MarketingBandSection
      id="knowledge"
      variant="contrast"
      eyebrow="Office standards"
      title="Knowledge Bank and development control — versioned."
      lead="Master DSR, specification catalogues, SteelFlow templates, and governed compliance rules live in one office library."
    >
      <Stack gap={7}>
        <MarketingTileGrid columns={2}>
          <MarketingFeatureTile>
            <Tag type="teal" size="sm">
              Knowledge Bank
            </Tag>
            <h3 className="esti-landing-section-title">Office standards and rate libraries</h3>
            <p>
              Master DSR, specification catalogue, SteelFlow templates, lessons learned,
              and official HCW seed packs for Indian cities — read-only where published by
              Holagundi Consulting Works.
            </p>
          </MarketingFeatureTile>
          <MarketingFeatureTile>
            <Tag type="blue" size="sm">
              Compliance
            </Tag>
            <h3 className="esti-landing-section-title">Pre- and post-construction calculations</h3>
            <p>
              One shared rule engine for development potential and post-construction audit.
              Outputs include coverage, FAR, setbacks, and buildable envelope — with source
              clauses and immutable PDF snapshots on the project.
            </p>
          </MarketingFeatureTile>
        </MarketingTileGrid>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Compliance boundary"
          subtitle="ESTI produces traceable calculations and PDF evidence. It does not connect to live BPAS or authority portals."
        />
      </Stack>
    </MarketingBandSection>
  );
}
