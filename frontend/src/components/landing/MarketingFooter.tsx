import { Link, Stack, Theme } from "@carbon/react";
import { LANDING_SEO } from "../../lib/landing-seo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

export function MarketingFooter() {
  return (
    <Theme theme="g100">
      <LandingBand className="esti-landing-footer">
        <LandingEditorial>
          <Stack gap={6}>
            <Stack orientation="horizontal" gap={6}>
              <img
                src="/aorms-logo-white.png"
                alt="AORMS"
                className="esti-landing-brand-logo"
              />
              <img
                src="/hcw-white.png"
                alt="Holagundi Consulting Works"
                className="esti-landing-hcw"
              />
            </Stack>
            <p>
              ESTI AORMS |{" "}
              <Link href="mailto:hi@aorms.in">hi@aorms.in</Link> | Developed by
              Holagundi Consulting Works
            </p>
            <p>{LANDING_SEO.footerBlurb}</p>
            <Link href="/login">Sign in to your workspace</Link>
          </Stack>
        </LandingEditorial>
      </LandingBand>
    </Theme>
  );
}
