import {
  Analytics,
  Building,
  Document,
  Finance,
  Idea,
  UserMultiple,
} from "@carbon/icons-react";
import { Column, Grid, Stack, Tag } from "@carbon/react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

const PILLARS: {
  icon: ElementType;
  tag: string;
  tagType: "blue" | "teal" | "purple" | "green" | "gray" | "cyan";
  title: string;
  body: string;
  modules: string[];
}[] = [
  {
    icon: Analytics,
    tag: "Operations",
    tagType: "blue",
    title: "Dashboard & Action Center",
    body: "Billing-ready phases, overdue collections, pending approvals, open tenders, and site RFIs on one command surface. One glance tells you what the practice needs today.",
    modules: ["KPI bar", "Action Center", "Activity feed"],
  },
  {
    icon: Idea,
    tag: "Change control",
    tagType: "purple",
    title: "CRIF revision intelligence",
    body: "Every client-driven change gets a decision record with revision source, budget impact, and scope drift percentage. Transparent studio memory — not revision blame.",
    modules: ["Decision register", "Revision budget", "Scope drift %"],
  },
  {
    icon: Finance,
    tag: "Commercial",
    tagType: "green",
    title: "COA fees & GST invoicing",
    body: "Fee proposals on COA scale, contracts, GST invoices in integer paise, TDS reconciliation, and quarterly filing abstracts — all linked to the project record.",
    modules: ["Fee proposals", "GST invoices", "TDS filing"],
  },
  {
    icon: Document,
    tag: "Drawings",
    tagType: "teal",
    title: "Drawing register & documents",
    body: "Issue sets, transmittals, revision control, spec sheets, and ESTICAD-linked takeoff quantities — every revision traceable to the project and linked consultant.",
    modules: ["Drawing register", "Transmittals", "Spec catalogue"],
  },
  {
    icon: UserMultiple,
    tag: "Collaboration",
    tagType: "cyan",
    title: "Portals & site coordination",
    body: "Client approvals, consultant deliverables, tender packages, and contractor RFIs through scoped portals — not WhatsApp. Staff coordinate from a single project inbox.",
    modules: ["Client portal", "Contractor tenders", "Site RFIs"],
  },
  {
    icon: Building,
    tag: "Knowledge",
    tagType: "gray",
    title: "Knowledge Bank & compliance",
    body: "Master DSR, BBMP development-control rules, specification catalogue, SteelFlow structural templates, and lessons learned — versioned and cited in project records.",
    modules: ["Master DSR", "BBMP compliance", "Spec catalogue"],
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
            title="Operational depth without ERP sprawl."
            lead="Six pillars Indian architecture studios run on daily — each module links back to the project record. Nothing floats outside the context."
          />
          <Grid fullWidth className="esti-landing-grid">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <Column key={p.title} sm={4} md={4} lg={8}>
                  <MarketingFeatureTile>
                    <Stack gap={3}>
                      <Stack orientation="horizontal" gap={3}>
                        <Icon size={24} aria-hidden className="esti-landing-feature-tile__icon" />
                        <Tag type={p.tagType} size="sm">
                          {p.tag}
                        </Tag>
                      </Stack>
                      <h3 className="esti-landing-section-title">{p.title}</h3>
                      <p>{p.body}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={3} className="esti-row">
                      {p.modules.map((mod) => (
                        <Tag key={mod} type="gray" size="sm">
                          {mod}
                        </Tag>
                      ))}
                    </Stack>
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
