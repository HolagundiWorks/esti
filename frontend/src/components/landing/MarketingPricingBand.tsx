import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Column, Grid, ListItem, Stack, Tag, Tile, UnorderedList } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import type { LandingTrialPlanContext } from "../LandingTrialForm.js";

const PLANS: Array<{
  ctx: LandingTrialPlanContext;
  name: string;
  pitch: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
  hosting: string;
  featured?: boolean;
  caps?: string;
}> = [
  {
    ctx: "LITE",
    name: "AORMS-Lite",
    pitch: "Start a small team workspace — free.",
    price: "Free",
    priceNote: "Forever",
    caps: "3 team members · 10 clients · 10 contractors · 5 projects",
    features: [
      "Clients, projects & client log",
      "Drawings, transmittals & approvals",
      "Documents & spec sheets",
      "Tasks, alerts & dashboard",
      "Client portal (1 project)",
      "Statutory permits (basic)",
    ],
    hosting: "Cloud (shared) · workspace request",
    cta: "Request Lite workspace",
  },
  {
    ctx: "CORE",
    name: "AORMS-Core",
    pitch: "The full office OS — design, build, bill.",
    price: "Contact for pricing",
    priceNote: "Cloud, billed annually",
    featured: true,
    features: [
      "Everything in Lite, plus —",
      "Construction / PMC — tenders, site, RA bills",
      "BOQ & Costing & Measurement window",
      "Revision intelligence",
      "GST invoicing, reconciliation & filing",
      "HR, payroll & ASPRF performance",
      "Consultant & contractor portals",
      "ESTI AI cognition & AI Studio",
      "Rate Books, Knowledge Bank, audit log",
    ],
    hosting: "Cloud · dedicated VM: 4 vCPU · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth · 1 snapshot · weekly backups · dedicated IP",
    cta: "Contact sales",
  },
  {
    ctx: "ENTERPRISE",
    name: "AORMS-Enterprise",
    pitch: "Core at scale — on your infrastructure.",
    price: "Contact for pricing",
    priceNote: "On-premises, custom terms",
    features: [
      "Everything in Core, plus —",
      "Unlimited seats & multi-office portfolios",
      "SSO & API access",
      "ESTICAD desktop integration",
      "Audit export & governance",
      "White-label",
      "Priority support with SLA",
    ],
    hosting: "On-premises — deployed on your infrastructure",
    cta: "Contact sales",
  },
];

export function MarketingPricingBand({ onSelectPlan }: { onSelectPlan: (ctx: LandingTrialPlanContext) => void }) {
  return (
    <LandingBand id="pricing" ariaLabelledby="pricing-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="pricing-title"
            eyebrow="Pricing"
            title="Start with the team workspace. Upgrade when you bill or build."
            lead="Three editions on one codebase. Lite gives small teams a governed starting workspace; Core unlocks billing, construction and AI; Enterprise runs on your infrastructure."
          />
          <Grid fullWidth className="esti-landing-tile-grid">
            {PLANS.map((p) => (
              <Column key={p.ctx} lg={5} md={8} sm={4}>
                <Tile className={`esti-pricing-tile${p.featured ? " esti-pricing-tile--featured" : ""}`}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3 className="esti-pricing-tile__name">{p.name}</h3>
                      {p.featured && <Tag type="blue" size="sm">Most firms</Tag>}
                    </Stack>
                    <p className="esti-pricing-tile__pitch">{p.pitch}</p>
                    <div>
                      <p className="esti-pricing-tile__price">{p.price}</p>
                      <p className="esti-label esti-label--secondary">{p.priceNote}</p>
                    </div>
                    {p.caps && (
                      <p className="esti-label">{p.caps}</p>
                    )}
                    <UnorderedList>
                      {p.features.map((f) => (
                        <ListItem key={f}>
                          <span className="esti-pricing-tile__check"><Checkmark size={16} /></span> {f}
                        </ListItem>
                      ))}
                    </UnorderedList>
                    <p className="esti-label esti-label--helper">{p.hosting}</p>
                    <Button
                      kind={p.featured ? "primary" : "tertiary"}
                      size="md"
                      onClick={() => onSelectPlan(p.ctx)}
                      renderIcon={ArrowRight}
                    >
                      {p.cta}
                    </Button>
                  </Stack>
                </Tile>
              </Column>
            ))}
          </Grid>
          <p className="esti-landing-section-lead">
            Lite is for small teams starting their office record — no GST invoicing, no
            reconciliation, no AI; in exchange, Lite data may be used (de-identified) to train our models.
            See the <a href="/legal">Terms</a> for details.
          </p>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
