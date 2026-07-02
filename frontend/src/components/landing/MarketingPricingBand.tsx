import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import { createAccountUrl } from "../../lib/onboarding.js";
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
    pitch: "Get your practice out of spreadsheets — free, with an offline desktop app.",
    price: "Free",
    priceNote: "Forever · licence-free",
    caps: "1 admin + up to 3 staff · unlimited clients, contractors & projects · 5 GB",
    features: [
      "Create your own staff logins (up to 3)",
      "Unlimited clients, contractors & projects",
      "Clients, projects & decision log",
      "Drawings, transmittals & approval records",
      "Simple (non-GST) invoices & bank reconciliation",
      "Tasks, reminders & dashboard warnings",
      "Client portal · contractor portal (view-only)",
      "Native desktop app — local data, no cloud needed",
    ],
    hosting: "Free cloud workspace · or the offline desktop app (Windows)",
    cta: "Request Lite workspace",
  },
  {
    ctx: "PRO",
    name: "AORMS-Pro",
    pitch: "Run the whole practice to one standard — delivery, fees, people, AI, on any scale.",
    price: "Contact for pricing",
    priceNote: "Cloud or self-hosted · billed annually",
    featured: true,
    caps: "Unlimited staff, storage, clients & projects · one edition, everything included",
    features: [
      "Everything in Lite, plus —",
      "Project delivery — phases, drawings, transmittals & site progress",
      "Client revision intelligence",
      "GST invoicing (CGST/SGST/IGST split, SAC, FY-sequential)",
      "26AS / AIS / GSTR reconciliation + GST/TDS filing abstracts",
      "HR, payroll & team performance scoring",
      "Consultant & contractor portals",
      "ESTI office intelligence & AI Studio (built-in or bring-your-own AI)",
      "Bring-your-own-storage (NAS / S3) · SSO · API access · audit log",
      "ESTICAD companion · self-hosting · multi-office · white-label",
    ],
    hosting: "Cloud (dedicated VM) or self-hosted on your own infrastructure",
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
          <p className="esti-lp-section-label">Choose how much of the framework you need</p>
          <h3 id="pricing-title" className="esti-lp-cta-h">
            Begin with a shared record, then adopt the full framework as the practice grows.
          </h3>
          <p className="esti-lp-note">
            Lite gives a small practice one shared record — free forever. Pro runs the whole
            practice to one standard — projects, GST, billing, revisions, site visits, portals,
            team load and AI — cloud-hosted or self-hosted on your own infrastructure.
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
            {p.ctx === "LITE" ? (
              // Instant self-serve: hand off to the licensing cloud to create an
              // account + AORMS trial, rather than the personal lead form.
              <Button
                kind="primary"
                size="md"
                href={createAccountUrl()}
                renderIcon={ArrowRight}
              >
                Create free account
              </Button>
            ) : (
              <Button
                kind={p.featured ? "primary" : "tertiary"}
                size="md"
                onClick={() => onSelectPlan(p.ctx)}
                renderIcon={ArrowRight}
              >
                {p.cta}
              </Button>
            )}
          </div>
          </div>
        ))}

      </div>
    </>
  );
}
