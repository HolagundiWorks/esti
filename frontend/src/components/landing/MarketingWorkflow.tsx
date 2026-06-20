import { Stack } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

const STEPS = [
  { label: "Enquiry & brief", description: "Client register → project brief on Info tab" },
  { label: "Design delivery", description: "Drawings, CRIF, tasks, consultants" },
  { label: "Issue & approve", description: "Transmittals, client portal acknowledgements" },
  { label: "Bill & reconcile", description: "Invoices, GST/TDS, Action Center collections" },
] as const;

export function MarketingWorkflow() {
  return (
    <LandingBand variant="muted" id="workflow" ariaLabelledby="workflow-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="workflow-title"
            eyebrow="How studios work"
            title="From first meeting to final account"
            lead="AORMS mirrors the architect's delivery ladder — every stage stays on the project record."
          />
          <MarketingTileGrid columns={4}>
            {STEPS.map((s, index) => (
              <MarketingFeatureTile key={s.label}>
                <p className="esti-landing-eyebrow">Step {index + 1}</p>
                <h3 className="esti-landing-section-title">{s.label}</h3>
                <p>{s.description}</p>
              </MarketingFeatureTile>
            ))}
          </MarketingTileGrid>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
