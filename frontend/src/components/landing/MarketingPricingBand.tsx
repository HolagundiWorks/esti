import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
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
      "Simple (non-GST) invoices & bank reconciliation",
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
      "Construction / PMC — tenders & bidding, site, RA bills",
      "BOQ & Costing & Measurement window",
      "Revision intelligence",
      "GST invoicing (CGST/SGST/IGST split, SAC, FY-sequential)",
      "26AS / AIS / GSTR reconciliation + GST/TDS filing abstracts",
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
    <div className="esti-lp-grid esti-lp-pricing-grid" id="pricing" aria-labelledby="pricing-title">
      <div className="esti-lp-tile esti-lp-tile--4x1 esti-lp-pricing-intro">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">Pricing</span>
          <span className="esti-lp-tile__hdr-meta">Team workspace</span>
        </div>
        <div className="esti-lp-pricing-intro__body">
          <p className="esti-lp-section-label">05 / Conversion</p>
          <h3 id="pricing-title" className="esti-lp-cta-h">
            Start with the team workspace. Upgrade when you bill or build.
          </h3>
          <p className="esti-lp-note">
            Three editions on one codebase. Lite gives small teams a governed starting workspace;
            Core unlocks billing, construction and AI; Enterprise runs on your infrastructure.
          </p>
        </div>
      </div>

      {PLANS.map((p) => (
        <div
          key={p.ctx}
          className={[
            "esti-lp-tile",
            "esti-lp-pricing-tile",
            p.featured ? "esti-lp-tile--2x1 esti-lp-pricing-tile--featured" : "",
          ].filter(Boolean).join(" ")}
        >
          <div className="esti-lp-tile__hdr">
            <span className={`esti-lp-dot esti-lp-dot--${p.featured ? "yellow" : "white"}`} aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">{p.name}</span>
            {p.featured && <Tag type="blue" size="sm">Most firms</Tag>}
          </div>
          <div className="esti-lp-pricing-tile__body">
            <p className="esti-lp-pricing-tile__pitch">{p.pitch}</p>
            <div className="esti-lp-pricing-tile__price-block">
              <p className="esti-lp-pricing-tile__price">{p.price}</p>
              <p className="esti-lp-note">{p.priceNote}</p>
            </div>
            {p.caps && <p className="esti-lp-note">{p.caps}</p>}
            <ul className="esti-lp-pricing-list">
              {p.features.map((f) => (
                <li key={f}>
                  <Checkmark size={16} aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="esti-lp-note">{p.hosting}</p>
            <Button
              kind={p.featured ? "primary" : "tertiary"}
              size="md"
              onClick={() => onSelectPlan(p.ctx)}
              renderIcon={ArrowRight}
            >
              {p.cta}
            </Button>
          </div>
        </div>
      ))}

      <div className="esti-lp-tile esti-lp-tile--4x1 esti-lp-pricing-note">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">Plan Note</span>
        </div>
        <div className="esti-lp-pricing-note__body">
          <p className="esti-lp-note">
            Lite is for studios below the GST registration threshold: simple invoices and bank
            reconciliation, but no GST split, no tenders / PMC, no AI. Lite data may be used,
            de-identified, to train our models. See the <a href="/legal">Terms</a> for details.
          </p>
        </div>
      </div>
    </div>
  );
}
