import {
  Analytics,
  Building,
  Document,
  Finance,
  Idea,
  UserMultiple,
} from "@carbon/icons-react";
import {
  Column,
  ExpandableTile,
  Grid,
  Stack,
  TileAboveTheFoldContent,
  TileBelowTheFoldContent,
} from "@carbon/react";
import type { ElementType } from "react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

const PILLARS: {
  icon: ElementType;
  title: string;
  lead: string;
  body: string;
  points: readonly string[];
}[] = [
  {
    icon: Analytics,
    title: "Know your practice at a glance",
    lead: "One screen. Every project's health at once.",
    body: "See billing status, overdue payments, pending approvals, and open site issues before the client calls. The Action Centre surfaces what needs you today.",
    points: [
      "Live billing and collection status across all projects",
      "Action Centre — approvals, overdue tasks, delayed deliverables",
      "ASPRF team performance score updated daily",
    ],
  },
  {
    icon: Idea,
    title: "Your scope, protected in writing",
    lead: "Log every change before a single hour is spent.",
    body: "Every client scope change is documented before work begins — who asked, when, and what it means for fee and timeline. When a client disputes a revision, the record speaks.",
    points: [
      "Change requests with client acknowledgement and timestamp",
      "Revision Intelligence — MINOR / MAJOR / CRITICAL classification",
      "Scope-change impact on fee and phase progress",
    ],
  },
  {
    icon: Finance,
    title: "From fee proposal to GST filing",
    lead: "Financials linked to the project that earned them.",
    body: "Proposals structured to COA service stages, tax invoices with the correct SAC code, TDS reconciliation, and filing abstracts — all in one place.",
    points: [
      "Fee proposals aligned to COA stage billing percentages",
      "GST tax invoices with SAC code and TDS deduction",
      "26AS / AIS reconciliation and quarterly filing abstracts",
    ],
  },
  {
    icon: Document,
    title: "A drawing register you can trust on site",
    lead: "Every drawing traceable to the decision that changed it.",
    body: "Issued sets, revision history, transmittals, and specifications — no more guessing which version is current. Works on site with the ESTICAD companion.",
    points: [
      "Drawing register with revision history and issued-to log",
      "Transmittal records — who received what and when",
      "ESTICAD companion for site measurement and DXF takeoff",
    ],
  },
  {
    icon: UserMultiple,
    title: "Clients get a portal, not a PDF on WhatsApp",
    lead: "One record, no forwarding.",
    body: "Each stakeholder gets a scoped view — clients approve drawings, consultants see their scope, contractors see the tender. Designed for Indian practice communication.",
    points: [
      "Client portal — drawings, decisions, and change approvals",
      "Consultant portal — scope, deliverables, and submissions",
      "Contractor portal — tender documents and BOQ",
    ],
  },
  {
    icon: Building,
    title: "Know what your site can carry",
    lead: "Never argue development-control rules from memory.",
    body: "Development-control rules for 8 Indian cities, master DSR rates, and a specification catalogue — versioned and cited in every project record.",
    points: [
      "BBMP, HMDA, MCGM and 5 more municipal rule engines",
      "Delhi Schedule of Rates — master reference with DSR version history",
      "Specification catalogue linked to BOQ line items",
    ],
  },
];

export function MarketingPillars() {
  return (
    <LandingBand
      id="platform"
      variant="lead"
      ariaLabelledby="platform-title"
    >
      <LandingEditorial>
          <Stack gap={10}>
            <MarketingSectionHead
              id="platform-title"
              eyebrow="What ESTI does"
              title="Six things every Indian studio struggles with. Solved."
              lead="Each pillar is a daily headache that disappears when it lives inside the project record — not scattered across your phone, laptop, and someone else's inbox."
              centered
            />
            <Grid fullWidth className="esti-landing-tile-grid">
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <Column key={p.title} sm={4} md={4} lg={8}>
                    <ExpandableTile
                      tileCollapsedIconText="Expand feature"
                      tileExpandedIconText="Collapse feature"
                      className="esti-landing-pillar-tile"
                    >
                      <TileAboveTheFoldContent>
                        <Stack gap={4} className="esti-landing-pillar-above">
                          <Icon size={24} aria-hidden />
                          <div>
                            <p className="esti-label--helper">{p.lead}</p>
                            <h3 className="esti-landing-section-title">{p.title}</h3>
                          </div>
                        </Stack>
                      </TileAboveTheFoldContent>
                      <TileBelowTheFoldContent>
                        <Stack gap={5} className="esti-landing-pillar-below">
                          <p>{p.body}</p>
                          <ul className="esti-landing-pillar-points">
                            {p.points.map((pt) => (
                              <li key={pt}>{pt}</li>
                            ))}
                          </ul>
                        </Stack>
                      </TileBelowTheFoldContent>
                    </ExpandableTile>
                  </Column>
                );
              })}
            </Grid>
          </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
