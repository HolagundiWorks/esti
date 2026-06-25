import { Link as RouterLink } from "react-router-dom";
import { LANDING_NAV } from "../../lib/landing-slugs.js";

export function MarketingSolutions() {
  return (
    <>
      <section className="esti-lp-section-break" aria-labelledby="solutions-title">
        <div className="esti-lp-section-break__copy">
          <p className="esti-lp-section-break__eyebrow">06 / Where Work Lands</p>
          <h2 id="solutions-title">Where the office record opens</h2>
          <p>
            Follow enquiry, drawings, approvals, billing, tenders, site work, and client
            decisions into the part of AORMS that holds them.
          </p>
        </div>
      </section>

      <div className="esti-lp-grid esti-lp-solutions-grid" aria-labelledby="solutions-title">
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
    </>
  );
}
