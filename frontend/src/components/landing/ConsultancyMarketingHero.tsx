import type { CSSProperties } from "react";
import { AORMS_CONSULTANCY } from "../../lib/product-nomenclature.js";

/** Engineering app hero — roadmap marketing on `/aorms-consultancy`. */
export function ConsultancyMarketingHero() {
  return (
    <section className="lp2-hero-wrap lp2-hero-wrap--platform" id="top" aria-labelledby="lp2-consultancy-h1">
      <div className="lp2-hero lp2-hero--platform lp2-hero--minimal">
        <div className="lp2-hero__canvas">
          <div className="lp2-hero__text lp2-hero__text--centered">
            <p className="lp2-hero__eyebrow lp2-hero-anim" style={{ "--lp-i": 0 } as CSSProperties}>
              {AORMS_CONSULTANCY.title}
              {" · "}
              <span className="lp2-plat-vertical__status">Roadmap</span>
            </p>
            <h1 id="lp2-consultancy-h1" className="lp2-hero__h1 lp2-hero-anim" style={{ "--lp-i": 1 } as CSSProperties}>
              One spine for engineering consultancies
              <span className="lp2-hero__h1-line">that advise on built-environment projects.</span>
            </h1>
            <p className="lp2-hero__sub lp2-hero-anim" style={{ "--lp-i": 2 } as CSSProperties}>
              {AORMS_CONSULTANCY.audience}. Operational and design frameworks,
              serial review chains, and governed knowledge — not construction project management.
            </p>
            <p className="lp2-hero__sub lp2-hero-anim" style={{ "--lp-i": 3 } as CSSProperties}>
              <a className="lp2-plat-vertical__cta" href={AORMS_CONSULTANCY.wikiPath}>
                Read the wiki overview →
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
