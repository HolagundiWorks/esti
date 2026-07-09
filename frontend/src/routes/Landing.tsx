import { useEffect } from "react";
import {
  CapabilitiesSection,
  FaqSection,
  IntelligenceSection,
  PortalsSection,
  PricingSection,
  TrustStrip,
  WorkflowSection,
} from "../components/landing/LandingSections.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyLandingSeo, injectLandingJsonLd } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

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
    <>
      <MarketingShell contours>
        <MarketingHero />
        <TrustStrip />
        <CapabilitiesSection />
        <WorkflowSection />
        <IntelligenceSection />
        <PortalsSection />
        <PricingSection />
        <FaqSection />
        <MarketingFooter visitCount={visitCount} />
      </MarketingShell>
    </>
  );
}
