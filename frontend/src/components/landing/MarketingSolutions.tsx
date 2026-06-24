import { Link as RouterLink } from "react-router-dom";
import { LANDING_NAV } from "../../lib/landing-slugs.js";

export function MarketingSolutions() {
  return (
    <div className="esti-lp-grid esti-lp-solutions-grid" aria-labelledby="solutions-title">
      <div className="esti-lp-tile esti-lp-tile--2x1 esti-lp-solutions-intro">
        <div className="esti-lp-tile__hdr">
          <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
          <span className="esti-lp-tile__hdr-label">02 / Where Work Lands</span>
          <span className="esti-lp-tile__hdr-meta">Workflow paths</span>
        </div>
        <div className="esti-lp-solutions-intro__body">
          <p className="esti-lp-section-label">Built around daily office movement</p>
          <h3 id="solutions-title" className="esti-lp-feature-title">
            Follow the trail from enquiry, drawings, approvals, billing, and site work into the right operating surface.
          </h3>
          <p className="esti-lp-note">
            Each path opens a focused view without leaving the shared project, client, finance,
            and team memory behind.
          </p>
        </div>
      </div>

      {LANDING_NAV.map((group) => (
        <nav key={group.heading} className="esti-lp-tile esti-lp-solution-tile" aria-label={group.heading}>
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--white" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">{group.heading}</span>
          </div>
          <div className="esti-lp-solution-tile__body">
            {group.links.map((item) => (
              <RouterLink key={item.slug} to={`/${item.slug}`}>
                {item.label}
              </RouterLink>
            ))}
          </div>
        </nav>
      ))}
    </div>
  );
}
