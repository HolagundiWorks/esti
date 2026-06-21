import { PROBLEM_TILES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingProblemBand() {
  return (
    <MarketingBandSection
      id="problem"
      variant="contrast"
      eyebrow="Sound familiar?"
      title="Your practice runs across six different apps."
      lead="Drawings in one folder. Approvals on WhatsApp. Fees in a spreadsheet. Compliance in a PDF nobody can find. Your client's decisions — in your head."
      centered
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
