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
    pitch: "Start with shared office memory before the practice becomes too scattered.",
    price: "Free",
    priceNote: "Forever",
    caps: "1 admin + up to 3 staff · 5 clients · 5 contractors · 5 projects · 5 GB",
    features: [
      "Create your own staff logins (up to 3)",
      "Clients, projects & decision log",
      "Drawings, transmittals & approval records",
      "Documents, specifications & office evidence",
      "Simple (non-GST) invoices & bank reconciliation",
      "Tasks, reminders & dashboard warnings",
      "Client portal · contractor portal (view-only)",
      "Basic statutory permit records",
    ],
    hosting: "Cloud (shared) · workspace request",
    cta: "Request Lite workspace",
  },
  {
    ctx: "CORE",
    name: "AORMS-Core",
    pitch: "Run the full architecture office system: delivery, money, people, site, and clients.",
    price: "Contact for pricing",
    priceNote: "Cloud, billed annually",
    featured: true,
    caps: "1 admin + 1 accountant + 1 HR + 10 staff · 200 GB · unlimited clients & projects",
    features: [
      "Everything in Lite, plus —",
      "Create your own users & projects (no fixed workspace)",
      "Construction / PMC — tenders, bidding, site records, RA bills",
      "BOQ, costing & measurement workflows",
      "Client revision intelligence",
      "GST invoicing (CGST/SGST/IGST split, SAC, FY-sequential)",
      "26AS / AIS / GSTR reconciliation + GST/TDS filing abstracts",
      "HR, payroll & ASPRF performance",
      "Consultant & contractor portals",
      "ESTI office intelligence & AI Studio",
      "Rate Books, Knowledge Bank, audit log",
    ],
    hosting: "Cloud · dedicated VM: 4 vCPU · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth · 1 snapshot · weekly backups · dedicated IP",
    cta: "Contact sales",
  },
  {
    ctx: "ENTERPRISE",
    name: "AORMS-Enterprise",
    pitch: "Deploy the architecture office record inside your own infrastructure.",
    price: "Contact for pricing",
    priceNote: "On-premises, custom terms",
    caps: "Self-hosted · unlimited seats, storage, clients & projects",
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
    <>
      <span id="trial" className="esti-lp-anchor" aria-hidden />
      <div className="esti-lp-grid esti-lp-pricing-grid" id="pricing" aria-labelledby="pricing-title">
        <div className="esti-lp-tile esti-lp-tile--4x1 esti-lp-pricing-intro">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">05 / Choose Workspace</span>
          <span className="esti-lp-tile__hdr-meta">Adoption path</span>
        </div>
        <div className="esti-lp-pricing-intro__body">
          <p className="esti-lp-section-label">Choose how much office memory you need</p>
          <h3 id="pricing-title" className="esti-lp-cta-h">
            Begin with a shared record, then grow into the full operating system when the office is ready.
          </h3>
          <p className="esti-lp-note">
            Lite gives a small practice one memory. Core carries the full architecture office:
            projects, GST, billing, revisions, site work, portals, and team load. Enterprise
            keeps the same discipline inside your own infrastructure.
          </p>
        </div>
        </div>

        {PLANS.map((p) => (
          <div
            key={p.ctx}
            className={[
              "esti-lp-tile",
              "esti-lp-pricing-tile",
              p.featured ? "esti-lp-pricing-tile--featured" : "",
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

      </div>
    </>
  );
}
