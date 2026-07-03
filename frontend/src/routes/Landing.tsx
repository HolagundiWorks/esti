import { Modal, Theme } from "@carbon/react";
import { useEffect, useState } from "react";
import { LandingTrialForm, type LandingTrialPlanContext } from "../components/LandingTrialForm.js";
import { MarketingPricingBand } from "../components/landing/MarketingPricingBand.js";
import {
  CollaborationSection,
  FaqSection,
  FeatureGroup1Section,
  FeatureGroup2Section,
  FinalCtaSection,
  IntegrationsSection,
  IntelligenceSection,
  ProductOverviewSection,
  ProductivityBenefitsSection,
  SecuritySection,
  CustomerSuccessSection,
  ValuePropositionSection,
  WorkflowOverviewSection,
} from "../components/landing/LandingOperationalGrid.js";
import { EarnedIdentitySection } from "../components/landing/LandingEarnedIdentity.js";
import { MarketingEstiAi } from "../components/landing/MarketingEstiAi.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyLandingSeo } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/**
 * Landing page content structure (docs/esti/CARBON-UI-DIRECTION.md's landing
 * exception applies — editorial system, not app Carbon). Section order:
 * Hero -> Value Proposition -> Product Overview -> Feature Group 1 ->
 * Feature Group 2 -> Workflow Overview -> Productivity Benefits ->
 * Collaboration -> Intelligence & Automation -> Integrations ->
 * Security & Reliability -> Customer Success -> Earned Identity -> FAQ -> Final CTA.
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

  function openPlanRequest(ctx: LandingTrialPlanContext) {
    setPlanContext(ctx);
    setRequestOpen(true);
  }

  return (
    <Theme theme="g100">
      <MarketingShell>
        <MarketingHero onTrialScroll={scrollToTrial} />

        <ValuePropositionSection />
        <ProductOverviewSection />
        <FeatureGroup1Section />
        <FeatureGroup2Section />
        <WorkflowOverviewSection />
        <ProductivityBenefitsSection />
        <CollaborationSection />
        <IntelligenceSection />
        <IntegrationsSection />
        <SecuritySection />
        <CustomerSuccessSection />
        <EarnedIdentitySection />
        <FaqSection />

        <FinalCtaSection>
          <MarketingPricingBand onSelectPlan={openPlanRequest} />
        </FinalCtaSection>

        <MarketingFooter onRequestWorkspace={scrollToTrial} visitCount={visitCount} />

        <Modal
          open={requestOpen}
          passiveModal
          className="esti-lp-request-modal"
          modalHeading={
            planContext === "LITE"
              ? "Create your free AORMS-Lite account"
              : planContext === "PRO"
              ? "Contact us about AORMS-Pro"
              : "Request a workspace"
          }
          onRequestClose={() => setRequestOpen(false)}
        >
          <LandingTrialForm planContext={planContext} />
        </Modal>
      </MarketingShell>

      <MarketingEstiAi />
    </Theme>
  );
}
