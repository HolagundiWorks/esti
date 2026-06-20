import { InlineNotification, Theme } from "@carbon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingDemoBand } from "../components/landing/MarketingDemoBand.js";
import { MarketingEstiAi } from "../components/landing/MarketingEstiAi.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingIndiaDeskBand } from "../components/landing/MarketingIndiaDeskBand.js";
import { MarketingLifecycleBand } from "../components/landing/MarketingLifecycleBand.js";
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

        {/* 1 — Hero: g100 dark, dual demo tiles */}
        <MarketingHero
          onStudioDemo={() => openDemo("studio")}
          onSoloDemo={() => openDemo("solo")}
          demoLoading={demoLoading}
          demoKind={demoKind}
          onTrialScroll={scrollToTrial}
        />

        {/* 2 — Problem: three pain points */}
        <MarketingProblemBand />

        {/* 3 — Platform: six pillars */}
        <MarketingPillars />

        {/* 4 — India desk: COA, GST, compliance */}
        <MarketingIndiaDeskBand />

        {/* 5 — Lifecycle: 8-stage tabs */}
        <MarketingLifecycleBand />

        {/* 6 — Demo: both accounts, tour guide */}
        <MarketingDemoBand
          onStudioDemo={() => openDemo("studio")}
          onSoloDemo={() => openDemo("solo")}
          demoLoading={demoLoading}
          demoKind={demoKind}
        />

        {/* 7 — Trial: request workspace */}
        <MarketingTrialBand />

        {/* 8 — Footer */}
        <MarketingFooter />
      </MarketingShell>

      <MarketingEstiAi />
    </Theme>
  );
}
