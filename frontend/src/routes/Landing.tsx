import { InlineNotification, Modal, Theme } from "@carbon/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingTrialForm } from "../components/LandingTrialForm.js";
import { LandingEditorial } from "../components/landing/LandingBand.js";
import { LandingOperationalGrid } from "../components/landing/LandingOperationalGrid.js";
import { MarketingEstiAi } from "../components/landing/MarketingEstiAi.js";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingHero } from "../components/landing/MarketingHero.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { demoLoginPayload, type DemoKind } from "../lib/landing-demo.js";
import { applyLandingSeo } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";
import { trpc } from "../lib/trpc.js";

export function Landing() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const visitCount = useLandingVisitCounter();
  const [demoKind, setDemoKind] = useState<DemoKind | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

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
    setRequestOpen(true);
  }

  const demoLoading = demoLogin.isPending;

  return (
    <Theme theme="g100">
      <MarketingShell visitCount={visitCount}>
        {demoLogin.error && (
          <LandingEditorial className="esti-landing-alert">
            <InlineNotification
              kind="error"
              title="Demo login failed"
              subtitle={demoLogin.error.message}
            />
          </LandingEditorial>
        )}

        <MarketingHero
          onStudioDemo={() => openDemo("team")}
          demoLoading={demoLoading}
          demoKind={demoKind}
          onTrialScroll={scrollToTrial}
        />

        <LandingOperationalGrid
          onStudioDemo={() => openDemo("team")}
          demoLoading={demoLoading}
          demoKind={demoKind}
          onTrialScroll={scrollToTrial}
        />

        <MarketingFooter onRequestWorkspace={scrollToTrial} />

        <Modal
          open={requestOpen}
          passiveModal
          className="esti-lp-request-modal"
          modalHeading="Request a workspace"
          onRequestClose={() => setRequestOpen(false)}
        >
          <LandingTrialForm />
        </Modal>
      </MarketingShell>

      <MarketingEstiAi />
    </Theme>
  );
}
