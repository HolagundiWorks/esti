import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { LandingTrialForm, type LandingTrialPlanContext } from "../components/LandingTrialForm.js";
import { MarketingPricingBand } from "../components/landing/MarketingPricingBand.js";
import {
  CustomerSuccessSection,
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  IntegrationsSection,
  PartnersSection,
  WhyUsSection,
} from "../components/landing/LandingOperationalGrid.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyLandingSeo } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/**
 * Landing page content structure (editorial landing system — MP025 light).
 * Section order follows the reference wireframe:
 * Nav -> Hero -> Partners -> Features -> Why Us -> Integrations ->
 * Reviews -> FAQ -> CTA (pricing) -> Footer.
 */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [planContext, setPlanContext] = useState<LandingTrialPlanContext | undefined>();

  useEffect(() => {
    applyLandingSeo();
  }, []);

  // Arriving via "/#section" (e.g. from the blog header): sections render on mount,
  // so wait a frame for the target to exist, then scroll to it.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  function scrollToTrial() {
    setPlanContext(undefined);
    setRequestOpen(true);
  }

  return (
    <>
      <MarketingShell downloads contours onRequestWorkspace={scrollToTrial}>
        {/* Structure follows the wireframe: Hero → Partners → Features → Why Us →
            Integrations → Reviews → FAQ → CTA → Footer. All CTAs live in the rail
            now — the stage/content is button-free. */}
        <MarketingHero />

        <PartnersSection />
        <FeaturesSection />
        <WhyUsSection />
        <IntegrationsSection />
        <CustomerSuccessSection />
        <FaqSection />

        <FinalCtaSection>
          <MarketingPricingBand />
        </FinalCtaSection>

        <MarketingFooter visitCount={visitCount} />

        <Dialog
          open={requestOpen}
          className="esti-lp-request-modal"
          onClose={() => setRequestOpen(false)}
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
            {planContext === "LITE"
              ? "Create your free AORMS Community account"
              : planContext === "PRO"
              ? "Contact us about AORMS-Pro"
              : "Request a workspace"}
            <IconButton aria-label="Close" onClick={() => setRequestOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <LandingTrialForm planContext={planContext} />
          </DialogContent>
        </Dialog>
      </MarketingShell>
    </>
  );
}
