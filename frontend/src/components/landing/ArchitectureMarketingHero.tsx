import type { CSSProperties } from "react";
import { AormsLogo } from "../AormsLogo.js";
import { AORMS_STUDIO } from "../../lib/product-nomenclature.js";

/** Architecture vertical hero — former home-page marketing composition. */
export function ArchitectureMarketingHero() {
  return (
    <section className="lp2-hero-wrap" id="top" aria-labelledby="lp2-h1">
      <div className="lp2-hero">
        <div className="lp2-hero__brand lp2-hero-anim" style={{ "--lp-i": 0 } as CSSProperties}>
          <AormsLogo variant="hero" />
        </div>

        <p className="lp2-hero__eyebrow lp2-hero-anim" style={{ "--lp-i": 1 } as CSSProperties}>
          {AORMS_STUDIO.title}
        </p>

        <h1 id="lp2-h1" className="lp2-hero__h1 lp2-hero-anim" style={{ "--lp-i": 2 } as CSSProperties}>
          From chaos to clarity.
          <span className="lp2-hero__h1-line">One living record for the practice.</span>
        </h1>

        <p className="lp2-hero__sub lp2-hero-anim" style={{ "--lp-i": 3 } as CSSProperties}>
          Fees, MoM-led revisions, GST and practice load stop living in folders, chats and
          spreadsheets — and share a single advisory workspace shaped for how Indian
          architecture consultancies actually work.
        </p>
      </div>
    </section>
  );
}
