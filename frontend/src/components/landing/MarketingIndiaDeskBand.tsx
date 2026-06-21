import { Tag } from "@carbon/react";
import { INDIA_DESK_TILES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingIndiaDeskBand() {
  return (
    <MarketingBandSection
      id="india"
      variant="muted"
      eyebrow="India desk"
      title="Built in India, not bolted on."
      lead="COA registration, GST invoicing, financial year 1 Apr–31 Mar, and development-control rules for 8 Indian cities are part of the product — not configuration you have to set up."
      centered
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
