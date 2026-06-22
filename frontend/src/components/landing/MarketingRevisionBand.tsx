import { Column, Grid, Theme } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import {
  RevisionIntelligenceTile,
  RevisionLegendTile,
  QUALITY_INTELLIGENCE_DEMO,
} from "../QualityIntelligenceTiles.js";

const DEMO = QUALITY_INTELLIGENCE_DEMO.revision;

export function MarketingRevisionBand() {
  return (
    <LandingBand id="revisions" variant="contrast" ariaLabelledby="revision-title">
      <LandingEditorial>
        <MarketingSectionHead
          id="revision-title"
          eyebrow="Revision intelligence"
          title="Know exactly where every change came from — before the dispute starts."
          lead="ESTI logs every design decision with its source, category, and approval. The revision dashboard tells you at a glance whether rework is driven by clients, internal errors, or technical queries — so you can address the real cause."
        />

        <Grid fullWidth className="esti-landing-tile-grid" style={{ marginTop: "var(--cds-spacing-08)" }}>
            {/* Donut chart tile */}
            <Column sm={4} md={4} lg={8}>
              <Theme theme="white">
                <RevisionIntelligenceTile
                  data={DEMO}
                  chartData={DEMO}
                  hasData
                  chartTheme="white"
                  chartAnimations={false}
                />
              </Theme>
            </Column>

            {/* Category legend table tile */}
            <Column sm={4} md={4} lg={8}>
              <Theme theme="white">
                <RevisionLegendTile data={DEMO} hasData />
              </Theme>
            </Column>
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
