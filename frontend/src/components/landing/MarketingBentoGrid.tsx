import {
  Analytics,
  Building,
  Document,
  Finance,
  Idea,
  UserMultiple,
} from "@carbon/icons-react";
import { Column, Grid, Stack, Tile } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const TILES = [
  {
    icon: Analytics,
    eyebrow: "Practice overview",
    title: "Every project's health on one screen",
    body: "Billing status, overdue payments, pending approvals, and open site issues — visible before the client calls. The Action Centre surfaces what needs you today.",
    bullets: [
      "Live billing and collection across all projects",
      "Overdue tasks and delayed deliverables flagged",
      "ASPRF team performance score updated daily",
    ],
  },
  {
    icon: Idea,
    eyebrow: "Scope protection",
    title: "Every revision documented before work begins",
    body: "Change requests captured with client acknowledgement and timestamp. MINOR / MAJOR / CRITICAL classification feeds the Revision Intelligence dashboard.",
    bullets: [
      "Client-acknowledged scope change records",
      "Revision impact on fee and phase progress",
      "Full audit trail — who asked, when, and why",
    ],
  },
  {
    icon: Finance,
    eyebrow: "Financials",
    title: "Fee proposal to GST filing in one system",
    body: "Proposals aligned to COA service stages, tax invoices with the correct SAC code, TDS reconciliation, and quarterly filing abstracts — linked to the project.",
    bullets: [
      "Fee proposals aligned to COA stage billing percentages",
      "GST tax invoices with SAC code and TDS deduction",
      "26AS / AIS reconciliation and filing abstracts",
    ],
  },
  {
    icon: Document,
    eyebrow: "Drawing register",
    title: "Every drawing traceable to the decision that changed it",
    body: "Issued sets, revision history, and transmittals — no more guessing which version is current. Works on site with the ESTICAD companion for DXF takeoff.",
    bullets: [
      "Drawing register with revision history and issued-to log",
      "Transmittal records — who received what and when",
      "ESTICAD companion for site measurement",
    ],
  },
  {
    icon: UserMultiple,
    eyebrow: "Portals",
    title: "Clients get a portal, not a PDF on WhatsApp",
    body: "Each stakeholder gets a scoped view — clients approve drawings, consultants see their scope, contractors see the tender. One record, no forwarding.",
    bullets: [
      "Client portal — drawings, decisions, and change approvals",
      "Consultant portal — scope, deliverables, and submissions",
      "Contractor portal — tender documents and BOQ",
    ],
  },
  {
    icon: Building,
    eyebrow: "India compliance",
    title: "Know what your site can carry — without argument",
    body: "Development-control rules for 8 Indian cities, master DSR rates, and a specification catalogue — versioned and cited in every project record.",
    bullets: [
      "BBMP, HMDA, MCGM, CMDA, BDA, GHMC, PMC, MCD",
      "Delhi Schedule of Rates with DSR version history",
      "Specification catalogue linked to BOQ line items",
    ],
  },
] as const;

export function MarketingBentoGrid() {
  return (
    <LandingBand ariaLabelledby="bento-label" className="esti-landing-bento-band">
      <LandingEditorial>
        <Grid fullWidth className="esti-landing-bento">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Column key={t.eyebrow} lg={8} md={8} sm={4}>
                <Tile className="esti-landing-bento-tile esti-fill">
                  <Stack gap={4}>
                    <Icon size={24} aria-hidden />
                    <Stack gap={2}>
                      <p className="esti-label--helper">{t.eyebrow}</p>
                      <h3 className="esti-landing-section-title">{t.title}</h3>
                    </Stack>
                    <p>{t.body}</p>
                    <ul className="esti-landing-bento-list">
                      {t.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </Stack>
                </Tile>
              </Column>
            );
          })}
        </Grid>
      </LandingEditorial>
    </LandingBand>
  );
}
