import {
  Analytics,
  Building,
  Document,
  Finance,
  Idea,
  UserMultiple,
} from "@carbon/icons-react";
import { Column, Grid, Stack } from "@carbon/react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

const PILLARS: {
  icon: ElementType;
  title: string;
  body: string;
}[] = [
  {
    icon: Analytics,
    title: "Know your practice at a glance",
    body: "See every project's billing status, overdue payments, pending approvals, and open site issues on one screen. Know the answer before the client calls.",
  },
  {
    icon: Idea,
    title: "Your scope, protected in writing",
    body: "Every client scope change is logged before work begins — who asked, when, and what it means for fee and timeline. When a client disputes a revision, the record speaks.",
  },
  {
    icon: Finance,
    title: "From fee proposal to GST filing",
    body: "Proposals structured to COA service stages, tax invoices with the correct SAC code, TDS reconciliation, and filing abstracts — all linked to the project that earned them.",
  },
  {
    icon: Document,
    title: "A drawing register you can trust on site",
    body: "Issued sets, revision history, transmittals, and specifications — every drawing traceable to the decision that changed it. No more guessing which version is current.",
  },
  {
    icon: UserMultiple,
    title: "Clients get a portal, not a PDF on WhatsApp",
    body: "Each stakeholder gets a scoped view of the project — clients approve drawings, consultants see their scope, contractors see the tender. One record, no forwarding.",
  },
  {
    icon: Building,
    title: "Know what your site can carry",
    body: "Development-control rules for 8 Indian cities, master DSR rates, and specification catalogue — versioned and cited in every project record. Never argue from memory again.",
  },
];

export function MarketingPillars() {
  return (
    <LandingBand id="platform" variant="muted" ariaLabelledby="platform-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="platform-title"
            eyebrow="What ESTI does"
            title="Six things every Indian studio struggles with. Solved."
            lead="Each pillar is a daily headache that disappears when it lives inside the project record — not scattered across your phone, laptop, and someone else's inbox."
            centered
          />
          <Grid fullWidth className="esti-landing-grid">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <Column key={p.title} sm={4} md={4} lg={5}>
                  <MarketingFeatureTile>
                    <Icon size={24} aria-hidden className="esti-landing-feature-tile__icon" />
                    <h3 className="esti-landing-section-title">{p.title}</h3>
                    <p>{p.body}</p>
                  </MarketingFeatureTile>
                </Column>
              );
            })}
          </Grid>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
