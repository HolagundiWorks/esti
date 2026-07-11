import { Box } from "@mui/material";
import { useEffect } from "react";
import {
  applyArchitectureLandingSeo,
  injectArchitectureLandingJsonLd,
} from "../../lib/architecture-landing-seo.js";
import { useLpReveal } from "../../lib/use-lp-reveal.js";
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
} from "./LandingSections.js";
import { ArchitectureMarketingHero } from "./ArchitectureMarketingHero.js";
import { LandingContours } from "./LandingContours.js";

/** Architecture vertical — canonical marketing scroll on `/login` (sign-in lives in the rail). */
export function ArchitectureLoginStage() {
  useLpReveal();

  useEffect(() => {
    applyArchitectureLandingSeo();
    injectArchitectureLandingJsonLd();
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
    <Box className="esti-auth-stage esti-auth-stage--marketing" component="div">
      <div className="esti-auth-stage__contours" aria-hidden>
        <LandingContours />
      </div>
      <div className="lp2-ds lp2-auth-architecture">
        <ArchitectureMarketingHero />
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
      </div>
    </Box>
  );
}
