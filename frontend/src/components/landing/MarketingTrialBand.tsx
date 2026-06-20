import { Accordion, AccordionItem, Link } from "@carbon/react";
import { LandingTrialForm } from "../LandingTrialForm.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

export function MarketingTrialBand() {
  return (
    <LandingBand id="trial" variant="contrast" ariaLabelledby="trial-title">
      <LandingEditorial>
        <Accordion>
          <AccordionItem
            title={
              <MarketingSectionHead
                id="trial-title"
                eyebrow="Get started"
                title="Request a workspace for your practice."
                lead="We review each request and provision a firm instance — self-hosted on your VPS or ours."
              />
            }
          >
            <LandingTrialForm />
            <p className="esti-landing-section-lead" style={{ marginTop: "1rem" }}>
              Already have access? <Link href="/login">Sign in to your workspace</Link>
            </p>
          </AccordionItem>
        </Accordion>
      </LandingEditorial>
    </LandingBand>
  );
}
