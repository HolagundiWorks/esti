import { InlineNotification, Stack, Tag } from "@carbon/react";
import { PRACTICE_LAYERS } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";

export function MarketingPositionBand() {
  return (
    <MarketingBandSection
      id="position"
      eyebrow="Product position"
      title="AORMS is your office record — ESTICAD is your 2D CAD."
      lead="ESTICAD replaces legacy 2D CAD for drawing production and takeoff. AORMS records what your office issues, approves, bills, and coordinates."
    >
      <Stack gap={6}>
        {PRACTICE_LAYERS.map((layer) => (
          <Stack
            key={layer.tag}
            orientation="horizontal"
            gap={5}
            className="esti-landing-layer-row"
          >
            <Tag type={layer.type} size="md">
              {layer.tag}
            </Tag>
            <p>{layer.detail}</p>
          </Stack>
        ))}
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="How the products fit"
          subtitle="ESTICAD is full 2D CAD on the desktop. AORMS is the traceable office record — projects, fees, portals, and compliance evidence — not a drawing editor."
        />
      </Stack>
    </MarketingBandSection>
  );
}
