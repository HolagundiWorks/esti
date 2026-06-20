import { ArrowRight, CloudUpload, Idea, Launch } from "@carbon/icons-react";
import { Button, Stack } from "@carbon/react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

const FEATURES: { icon: ElementType; title: string; body: string }[] = [
  {
    icon: Launch,
    title: "Open in ESTICAD",
    body: "Launch desktop takeoff from any project drawing row on the Drawings tab.",
  },
  {
    icon: CloudUpload,
    title: "Synced quantities",
    body: "Cloud-synced takeoff quantities feed Estimates and DSR-linked BOQ workflows.",
  },
  {
    icon: Idea,
    title: "Companion CAD AI",
    body: "CAD AI drafts run through the desktop companion — not inside the browser.",
  },
];

export function MarketingEsticadBand({
  onStudioDemo,
  demoLoading,
}: {
  onStudioDemo: () => void;
  demoLoading: boolean;
}) {
  return (
    <LandingBand id="esticad" ariaLabelledby="esticad-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="esticad-title"
            eyebrow="ESTICAD companion"
            title="Desktop takeoff — web office record"
            lead="Quantities are captured in ESTICAD on the architect's machine. AORMS lists them on Drawings and feeds Estimates — no browser measure tool."
          />
          <Stack gap={7}>
            <MarketingTileGrid columns={4}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <MarketingFeatureTile key={f.title}>
                    <Icon size={32} aria-hidden className="esti-landing-feature-tile__icon" />
                    <h3 className="esti-landing-section-title">{f.title}</h3>
                    <p>{f.body}</p>
                  </MarketingFeatureTile>
                );
              })}
              <MarketingFeatureTile centered>
                <img
                  src="/esticad-logo.png"
                  alt="ESTICAD"
                  className="esti-landing-esticad-logo"
                />
              </MarketingFeatureTile>
            </MarketingTileGrid>
            <Button
              kind="primary"
              size="lg"
              renderIcon={ArrowRight}
              onClick={onStudioDemo}
              disabled={demoLoading}
            >
              {demoLoading ? "Opening…" : "See linked drawing in demo"}
            </Button>
          </Stack>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
