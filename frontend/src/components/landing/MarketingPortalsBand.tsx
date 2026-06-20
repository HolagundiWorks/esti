import { Tag } from "@carbon/react";
import { PORTAL_TILES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureClickableTile } from "./MarketingFeatureTile.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

export function MarketingPortalsBand({ onTrialScroll }: { onTrialScroll: () => void }) {
  return (
    <MarketingBandSection
      id="portals"
      eyebrow="Collaboration"
      title="Project-scoped portals — not another chat app."
      lead="Clients, consultants, and contractors see only what their engagement allows. Portals are scoped in the backend — not office staff with a different skin."
    >
      <MarketingTileGrid columns={3}>
        {PORTAL_TILES.map((portal) => (
          <MarketingFeatureClickableTile key={portal.tag} onClick={onTrialScroll}>
            <Tag type={portal.type} size="md">
              {portal.tag}
            </Tag>
            <h3 className="esti-landing-section-title">{portal.who}</h3>
            <p>{portal.detail}</p>
          </MarketingFeatureClickableTile>
        ))}
      </MarketingTileGrid>
    </MarketingBandSection>
  );
}
