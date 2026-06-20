import { Tag } from "@carbon/react";
import { INDIA_DESK_TILES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingIndiaDeskBand() {
  return (
    <MarketingBandSection
      id="india"
      eyebrow="India desk"
      title="Built for Indian practice — not adapted later."
      lead="COA registration, GST systems, financial year, lakh/crore formatting, and versioned development-control rules are fixed in the product profile."
    >
      <MarketingTileGrid columns={2}>
        {INDIA_DESK_TILES.map((tile) => (
          <MarketingFeatureTile key={tile.tag}>
            <Tag type={tile.type} size="sm">
              {tile.tag}
            </Tag>
            <p className="esti-landing-feature-tile__metric">{tile.metric}</p>
            <p>{tile.detail}</p>
          </MarketingFeatureTile>
        ))}
      </MarketingTileGrid>
    </MarketingBandSection>
  );
}
