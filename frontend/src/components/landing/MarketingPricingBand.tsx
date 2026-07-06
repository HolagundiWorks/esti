import { Button, Chip } from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Check from "@mui/icons-material/Check";
import DownloadIcon from "@mui/icons-material/Download";
import { createAccountUrl } from "../../lib/onboarding.js";
import { trpc } from "../../lib/trpc.js";
import type { LandingTrialPlanContext } from "../LandingTrialForm.js";

// Build-time fallback for the free Lite installer (deploy/fetch-installers.sh);
// the live resolver (marketing.desktopInstallers) takes precedence when available.
const LITE_DOWNLOAD_FALLBACK =
  (import.meta.env.VITE_COMMUNITY_DOWNLOAD_URL as string | undefined) ??
  (import.meta.env.VITE_LITE_DOWNLOAD_URL as string | undefined) ??
  "/download";

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
    caps: "1 admin + up to 3 staff · unlimited clients, contractors & projects · local storage on your device",
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
    caps: "Unlimited staff, clients & projects · 10 GB cloud storage (mirrored to the desktop app · expandable)",
    features: [
      "Everything in Lite, plus —",
      "Project delivery — phases, drawings, transmittals & site progress",
      "Client revision intelligence",
      "GST invoicing (CGST/SGST/IGST split, SAC, FY-sequential)",
      "26AS / AIS / GSTR reconciliation + GST/TDS filing abstracts",
      "HR, payroll & team performance scoring",
      "Consultant & contractor portals",
      "ESTI AI & AI Studio — LLM / RAG run locally, fetch your cloud data",
      "10 GB cloud storage, mirrored to desktop · buy add-on storage · archive closed projects",
      "SSO · API access · audit log · ESTICAD companion · multi-office · white-label",
    ],
    hosting: "Cloud (dedicated VM) or self-hosted · Enterprise adds bring-your-own-storage (on-prem)",
    cta: "Contact sales",
  },
];

export function MarketingPricingBand({ onSelectPlan }: { onSelectPlan: (ctx: LandingTrialPlanContext) => void }) {
  const installersQ = trpc.marketing.desktopInstallers.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const liteDownloadUrl = installersQ.data?.lite ?? LITE_DOWNLOAD_FALLBACK;
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
            {p.featured && (
              <Chip
                size="small"
                label="Most firms"
                sx={{
                  backgroundColor: "var(--cds-tag-background-blue)",
                  color: "var(--cds-tag-color-blue)",
                }}
              />
            )}
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
                  <Check sx={{ fontSize: 16 }} aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="esti-lp-note">{p.hosting}</p>
            {p.ctx === "LITE" ? (
              // Instant self-serve: hand off to the licensing cloud to create an
              // account + AORMS trial, or download the free offline Community
              // appliance to run the whole office on the local network.
              <div className="esti-lp-pricing-tile__ctas">
                <Button
                  variant="contained"
                  href={createAccountUrl()}
                  endIcon={<ArrowForward />}
                >
                  Create free account
                </Button>
                <Button
                  variant="outlined"
                  href={liteDownloadUrl}
                  endIcon={<DownloadIcon />}
                >
                  Download Lite (offline)
                </Button>
              </div>
            ) : (
              <Button
                variant={p.featured ? "contained" : "outlined"}
                onClick={() => onSelectPlan(p.ctx)}
                endIcon={<ArrowForward />}
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
