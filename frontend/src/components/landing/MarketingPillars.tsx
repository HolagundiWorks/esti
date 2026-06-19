import {
  Analytics,
  Building,
  Document,
  Finance,
  Idea,
  UserMultiple,
} from "@carbon/icons-react";
import { Stack } from "@carbon/react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

const PILLARS: {
  icon: ElementType;
  title: string;
  body: string;
}[] = [
  {
    icon: Analytics,
    title: "Dashboard & Action Center",
    body: "Billing-ready phases, overdue invoices, pending approvals, tenders, and site coordination on one command surface.",
  },
  {
    icon: Idea,
    title: "CRIF revision intelligence",
    body: "Decision register with revision budgets and impact previews — transparent studio memory, not surveillance.",
  },
  {
    icon: Finance,
    title: "Commercial & GST",
    body: "COA fee proposals, contracts, invoices, TDS, reconciliation, and filing abstracts in integer paise.",
  },
  {
    icon: Document,
    title: "Drawings & documents",
    body: "Issue registers, transmittals, spec sheets, and ESTICAD-linked quantities — every revision traceable.",
  },
  {
    icon: UserMultiple,
    title: "Portals & coordination",
    body: "Scoped client, consultant, and contractor portals — plus tenders and site RFIs from the office inbox.",
  },
  {
    icon: Building,
    title: "Knowledge Bank",
    body: "Master DSR, BBMP compliance rules, specification catalogue, SteelFlow templates, and lessons learned.",
  },
];

export function MarketingPillars() {
  return (
    <LandingBand id="platform" ariaLabelledby="platform-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="platform-title"
            eyebrow="Platform"
            title="Operational depth without ERP sprawl"
            lead="Six foundations Indian studios run on daily — each module links back to the project record."
          />
          <MarketingTileGrid columns={2}>
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <MarketingFeatureTile key={p.title}>
                  <Icon size={32} aria-hidden className="esti-landing-feature-tile__icon" />
                  <h3 className="esti-landing-section-title">{p.title}</h3>
                  <p>{p.body}</p>
                </MarketingFeatureTile>
              );
            })}
          </MarketingTileGrid>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
