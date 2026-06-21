import { InlineNotification, Theme } from "@carbon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingDemoBand } from "../components/landing/MarketingDemoBand.js";
import { MarketingDemoRolesBand } from "../components/landing/MarketingDemoRolesBand.js";
import { MarketingEstiAi } from "../components/landing/MarketingEstiAi.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingAccessBand } from "../components/landing/MarketingAccessBand.js";
import { MarketingRevisionBand } from "../components/landing/MarketingRevisionBand.js";
import { MarketingIndiaDeskBand } from "../components/landing/MarketingIndiaDeskBand.js";
import { MarketingPillars } from "../components/landing/MarketingPillars.js";
import { MarketingProblemBand } from "../components/landing/MarketingProblemBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { MarketingTrialBand } from "../components/landing/MarketingTrialBand.js";
import { demoLoginPayload, type DemoKind } from "../lib/landing-demo.js";
import { applyLandingSeo } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";
import { trpc } from "../lib/trpc.js";

export function Landing() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const visitCount = useLandingVisitCounter();
  const [demoKind, setDemoKind] = useState<DemoKind | null>(null);

  const demoLogin = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onSettled: () => setDemoKind(null),
  });

  useEffect(() => {
    applyLandingSeo();
  }, []);

  function openDemo(kind: DemoKind) {
    setDemoKind(kind);
    demoLogin.mutate(demoLoginPayload(kind));
  }

  function scrollToTrial() {
    document.getElementById("trial")?.scrollIntoView({ behavior: "smooth" });
  }

  const demoLoading = demoLogin.isPending;

  return (
    <Theme theme="white">
      <MarketingShell visitCount={visitCount}>
        {demoLogin.error && (
          <LandingEditorial className="esti-landing-alert">
            <InlineNotification
              kind="error"
              lowContrast
              title="Demo login failed"
              subtitle={demoLogin.error.message}
            />
          </LandingEditorial>
        )}

        {/* 1 — Hero: centered text, full-width dashboard preview */}
        <MarketingHero
          onStudioDemo={() => openDemo("studio")}
          onSoloDemo={() => openDemo("solo")}
          demoLoading={demoLoading}
          demoKind={demoKind}
          onTrialScroll={scrollToTrial}
        />

        {/* 2 — Problem: centered, contrast band */}
        <MarketingProblemBand />

        {/* 3 — Platform: six pillars, centered head, muted band */}
        <MarketingPillars />

        {/* 4 — Access hierarchy: L1–L5 roles + external portals */}
        <MarketingAccessBand />

        {/* 5 — Revision intelligence: donut chart + categories */}
        <MarketingRevisionBand />

        {/* 6 — India desk: COA, GST, compliance, muted band */}
        <MarketingIndiaDeskBand />

        {/* 5 — Demo: both accounts */}
        <MarketingDemoBand
          onStudioDemo={() => openDemo("studio")}
          onSoloDemo={() => openDemo("solo")}
          demoLoading={demoLoading}
          demoKind={demoKind}
        />

        {/* 5b — Demo roles: step into any seat */}
        <MarketingDemoRolesBand />

        {/* 6 — Trial: request workspace */}
        <MarketingTrialBand />

        {/* 7 — Footer */}
        <MarketingFooter />
      </MarketingShell>

      <MarketingEstiAi />
    </Theme>
  );
}
