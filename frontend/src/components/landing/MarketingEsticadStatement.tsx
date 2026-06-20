import { Column, Grid, ListItem, Tag, UnorderedList } from "@carbon/react";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";

export function MarketingEsticadStatement() {
  return (
    <MarketingBandSection
      id="esticad"
      eyebrow="ESTICAD — 2D CAD"
      title="Full 2D CAD — built to replace legacy drawing tools."
      lead="ESTICAD is free desktop software with professional 2D drafting, takeoff, and AI assistance. It is intended to replace AutoCAD and similar for architectural drawing production — with drawings and quantities synced to AORMS."
    >
      <Grid fullWidth className="esti-landing-grid">
        <Column sm={4} md={4} lg={8}>
          <MarketingFeatureTile>
            <img
              src="/esticad-logo.png"
              alt="ESTICAD"
              className="esti-landing-esticad-logo"
            />
            <h3 className="esti-landing-section-title">ESTICAD desktop</h3>
            <p>
              Native 2D CAD as capable as traditional drawing software — plans, sections,
              details, layers, blocks, and measurement tools. AI reconciliation runs through
              your office Ollama gateway. Offline drafting works locally; cloud takeoff and
              sync require an authenticated paying firm account.
            </p>
            <Tag type="blue" size="sm">
              Free desktop · Windows · Replaces 2D CAD
            </Tag>
          </MarketingFeatureTile>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <MarketingFeatureTile>
            <p className="esti-landing-eyebrow">Synced to AORMS</p>
            <h3 className="esti-landing-section-title">Issue register and estimation</h3>
            <UnorderedList>
              <ListItem>Drawing register with Open in ESTICAD from any project row</ListItem>
              <ListItem>Cloud-synced takeoff measurements feed BOQ and DSR estimates</ListItem>
              <ListItem>No browser CAD — drafting and takeoff stay in ESTICAD on the desktop</ListItem>
            </UnorderedList>
            <Tag type="gray" size="sm">
              AORMS records · ESTICAD draws
            </Tag>
          </MarketingFeatureTile>
        </Column>
      </Grid>
    </MarketingBandSection>
  );
}
