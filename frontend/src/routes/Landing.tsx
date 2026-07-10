import { useEffect } from "react";
import {
  CapabilitiesSection,
  ClientRevisionSection,
  DrawingsSection,
  FaqSection,
  FeeRecoverySection,
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
import { useLpReveal } from "../lib/use-lp-reveal.js";

export function Landing() {
  const visitCount = useLandingVisitCounter();
  useLpReveal();

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
    <MarketingShell contours>
      <MarketingHero />
      <TrustStrip />
      <FeeRecoverySection />
      <ClientRevisionSection />
      <CapabilitiesSection />
      <WorkflowSection />
      <IntelligenceSection />
      <DrawingsSection />
      <PortalsSection />
      <PricingSection />
      <FaqSection />
      <MarketingFooter visitCount={visitCount} />
    </MarketingShell>
  );
}
