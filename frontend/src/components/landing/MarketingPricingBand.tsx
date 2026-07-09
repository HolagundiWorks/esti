import { Chip } from "@mui/material";
import Check from "@mui/icons-material/Check";

const INCLUDED = [
  "Unlimited staff, clients, contractors and projects",
  "Projects, drawings, transmittals, approvals and revision intelligence",
  "GST invoicing, reconciliation and filing abstracts",
  "HR, payroll, team performance and portals",
  "ESTI cognition, Ask ESTI and AI Studio",
  "5 GB cloud storage included on every new account",
];

const METERS = [
  {
    name: "Storage",
    pitch: "Drawings, documents and generated PDFs in secure cloud storage.",
    price: "5 GB included",
    priceNote: "Then per GB-month as you grow",
    features: [
      "Usage dashboard in Company settings",
      "Archive closed projects to reclaim space",
      "Optional storage add-ons",
    ],
  },
  {
    name: "AI model",
    pitch: "Ask ESTI and AI Studio on the hosted model — or plug in your own API.",
    price: "Metered usage",
    priceNote: "Or bring your own OpenAI-compatible key",
    featured: true,
    features: [
      "Hosted inference billed per usage",
      "BYO API key — your endpoint, your model, no hosted meter",
      "Falls back safely if the provider is unreachable",
    ],
  },
];

export function MarketingPricingBand() {
  return (
    <>
      <span id="signup" className="esti-lp-anchor" aria-hidden />
      <div className="esti-lp-grid esti-lp-pricing-grid" id="pricing" aria-labelledby="pricing-title">
        <div className="esti-lp-tile esti-lp-tile--4x1 esti-lp-pricing-intro">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">05 / Pricing</span>
            <span className="esti-lp-tile__hdr-meta">Usage-based</span>
          </div>
          <div className="esti-lp-pricing-intro__body">
            <p className="esti-lp-section-label">One standard licence</p>
            <h3 id="pricing-title" className="esti-lp-cta-h">
              Start with the full workspace. Pay for storage and AI as you scale.
            </h3>
            <p className="esti-lp-note">
              Every new account gets <strong>5 GB</strong> of storage and the complete AORMS
              feature set. There are no caps on users, clients or contractors. Detailed
              construction estimating runs in <strong>AORMS Estimate</strong> on the desktop —
              signed in and linked to your projects.
            </p>
            <ul className="esti-lp-pricing-list esti-lp-pricing-list--compact">
              {INCLUDED.map((f) => (
                <li key={f}>
                  <Check sx={{ fontSize: 16 }} aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {METERS.map((p) => (
          <div
            key={p.name}
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
                  label="Optional BYO key"
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
              <ul className="esti-lp-pricing-list">
                {p.features.map((f) => (
                  <li key={f}>
                    <Check sx={{ fontSize: 16 }} aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        <div className="esti-lp-tile esti-lp-pricing-tile esti-lp-pricing-tile--estimate">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">AORMS Estimate</span>
            <span className="esti-lp-tile__hdr-meta">Desktop only</span>
          </div>
          <div className="esti-lp-pricing-tile__body">
            <p className="esti-lp-pricing-tile__pitch">
              Detailed BOQ, measurement, materials and BBS — on Windows. Sign in with your
              AORMS account; export sealed estimates into project Cost Management.
            </p>
            <p className="esti-lp-note">
              Download from the rail · authentication required before estimating · no separate tier.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
