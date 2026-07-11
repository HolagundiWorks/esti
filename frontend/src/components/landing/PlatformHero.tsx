import type { CSSProperties } from "react";
import { AormsLogo } from "../AormsLogo.js";
import { AORMS_PLATFORM, PLATFORM_FRAMEWORKS } from "../../lib/product-nomenclature.js";

/** Platform home hero — logo + headline + one supporting line (HCW-UI-KIT § Hero composition). */
export function PlatformHero() {
  const subline = `${AORMS_PLATFORM.name} gives AEC consulting firms — architecture and engineering practices — an ${PLATFORM_FRAMEWORKS.operational.title.toLowerCase()} and a ${PLATFORM_FRAMEWORKS.design.title.toLowerCase()} on one spine. Not solution delivery. Not construction project management.`;

  return (
    <section className="lp2-hero-wrap lp2-hero-wrap--platform" id="top" aria-labelledby="lp2-h1">
      <div className="lp2-hero lp2-hero--platform lp2-hero--minimal">
        <div className="lp2-hero__canvas">
          <div className="lp2-hero__text lp2-hero__text--centered">
            <div className="lp2-hero__brand lp2-hero-anim" style={{ "--lp-i": 0 } as CSSProperties}>
              <AormsLogo variant="hero" />
            </div>
            <h1 id="lp2-h1" className="lp2-hero__h1 lp2-hero-anim" style={{ "--lp-i": 1 } as CSSProperties}>
              {AORMS_PLATFORM.heroHeadline[0]}
              <span className="lp2-hero__h1-line">{AORMS_PLATFORM.heroHeadline[1]}</span>
            </h1>
            <p className="lp2-hero__sub lp2-hero-anim" style={{ "--lp-i": 2 } as CSSProperties}>
              {subline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
