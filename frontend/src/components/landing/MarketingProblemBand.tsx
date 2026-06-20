import { PROBLEM_TILES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingProblemBand() {
  return (
    <MarketingBandSection
      id="problem"
      variant="muted"
      eyebrow="The problem"
      title="Important work lives outside the project."
      lead="Drawings in one folder, approvals in WhatsApp, fees in a spreadsheet, compliance in a PDF someone saved in 2023."
    >
      <MarketingTileGrid columns={3}>
        {PROBLEM_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <MarketingFeatureTile key={tile.title}>
              <Icon size={32} aria-hidden className="esti-landing-feature-tile__icon" />
              <h3 className="esti-landing-section-title">{tile.title}</h3>
              <p>{tile.body}</p>
            </MarketingFeatureTile>
          );
        })}
      </MarketingTileGrid>
    </MarketingBandSection>
  );
}
