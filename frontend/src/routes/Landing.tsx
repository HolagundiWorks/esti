import { useEffect } from "react";
import {
  DualTierAISection,
  PlatformFaqSection,
  PlatformModulesSection,
  PlatformTrustStrip,
  FrameworksSection,
  VerticalsSection,
} from "../components/landing/PlatformLandingSections.js";
import { PlatformHero } from "../components/landing/PlatformHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyLandingSeo, injectLandingJsonLd } from "../lib/landing-seo.js";
import { PLATFORM_LANDING_SECTIONS } from "../lib/landing-nav.js";
import { AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/** AORMS platform home — marketing landing (not the architecture vertical page). */
export function Landing() {
  const visitCount = useLandingVisitCounter();

  useEffect(() => {
    applyLandingSeo();
    injectLandingJsonLd();
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
      sectionLinks={PLATFORM_LANDING_SECTIONS}
      tagline={AORMS_PLATFORM.expansion}
      visitCount={visitCount}
      vertical="platform"
    >
      <div className="lp2-ds">
        <PlatformHero />
        <PlatformTrustStrip />
        <FrameworksSection />
        <DualTierAISection />
        <PlatformModulesSection />
        <VerticalsSection />
        <PlatformFaqSection />
      </div>
    </MarketingShell>
  );
}
