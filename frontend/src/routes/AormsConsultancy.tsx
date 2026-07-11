import { useEffect } from "react";
import {
  ConsultancyAgentsSection,
  ConsultancyCapabilitiesSection,
  ConsultancyCompareSection,
  ConsultancyFaqSection,
  ConsultancyFrameworksSection,
} from "../components/landing/ConsultancyLandingSections.js";
import { ConsultancyMarketingHero } from "../components/landing/ConsultancyMarketingHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { CONSULTANCY_LANDING_SECTIONS } from "../lib/consultancy-landing-nav.js";
import {
  applyConsultancyLandingSeo,
  injectConsultancyLandingJsonLd,
} from "../lib/consultancy-landing-seo.js";
import { AORMS_CONSULTANCY } from "../lib/product-nomenclature.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/** AORMS-Consultancy marketing — engineering app roadmap page. */
export function AormsConsultancy() {
  const visitCount = useLandingVisitCounter();

  useEffect(() => {
    applyConsultancyLandingSeo();
    injectConsultancyLandingJsonLd();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <MarketingShell
      contours
      sectionLinks={CONSULTANCY_LANDING_SECTIONS}
      tagline={AORMS_CONSULTANCY.tagline}
      vertical="platform"
      footerVariant="platform"
      visitCount={visitCount}
      showConversionDock={false}
    >
      <div className="lp2-ds">
        <ConsultancyMarketingHero />
        <ConsultancyFrameworksSection />
        <ConsultancyCapabilitiesSection />
        <ConsultancyAgentsSection />
        <ConsultancyCompareSection />
        <ConsultancyFaqSection />
      </div>
    </MarketingShell>
  );
}
