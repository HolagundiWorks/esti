import { InlineNotification, Theme } from "@carbon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MarketingBetaBand } from "../components/landing/MarketingBetaBand.js";
import { MarketingEstiAi } from "../components/landing/MarketingEstiAi.js";
import { MarketingEsticadBand } from "../components/landing/MarketingEsticadBand.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingImpactGrid } from "../components/landing/MarketingImpactGrid.js";
import { MarketingPillars } from "../components/landing/MarketingPillars.js";
import { MarketingRecommended } from "../components/landing/MarketingRecommended.js";
import { LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { MarketingWorkflow } from "../components/landing/MarketingWorkflow.js";
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

  function scrollToBeta() {
    document.getElementById("beta")?.scrollIntoView({ behavior: "smooth" });
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
        <MarketingHero onStudioDemo={() => openDemo("studio")} demoLoading={demoLoading} />
        <MarketingRecommended
          onStudioDemo={() => openDemo("studio")}
          onSoloDemo={() => openDemo("solo")}
          onBetaScroll={scrollToBeta}
          demoKind={demoKind}
        />
        <MarketingPillars />
        <MarketingImpactGrid onStudioDemo={() => openDemo("studio")} demoLoading={demoLoading} />
        <MarketingWorkflow />
        <MarketingEsticadBand onStudioDemo={() => openDemo("studio")} demoLoading={demoLoading} />
        <MarketingBetaBand />
        <MarketingFooter />
      </MarketingShell>
      <MarketingEstiAi />
    </Theme>
  );
}
