import { ArrowRight } from "@carbon/icons-react";
import { Button, Link, Stack, Theme } from "@carbon/react";
import { LANDING_SEO } from "../../lib/landing-seo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const PRODUCT_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#compliance", label: "Compliance" },
  { href: "#demo", label: "Demo workspace" },
  { href: "#trial", label: "Request access" },
] as const;

const CONTACT_LINKS = [
  { href: "mailto:hi@aorms.in", label: "hi@aorms.in" },
  { href: "/login", label: "Workspace sign in" },
] as const;

export function MarketingFooter({ onRequestWorkspace }: { onRequestWorkspace?: () => void }) {
  return (
    <Theme theme="g100">
      <LandingBand className="esti-landing-footer">
        <LandingEditorial>
          <footer className="esti-landing-footer__grid" aria-label="AORMS footer">
            <div className="esti-landing-footer__brand">
              <img
                src="/aorms-logo-white.png"
                alt="AORMS"
                className="esti-landing-footer__aorms"
              />
              <p>{LANDING_SEO.footerBlurb}</p>
              <Button
                kind="primary"
                size="sm"
                onClick={onRequestWorkspace}
                renderIcon={ArrowRight}
              >
                Request workspace
              </Button>
            </div>

            <nav className="esti-landing-footer__nav" aria-label="Product">
              <h2>Product</h2>
              <Stack gap={3}>
                {PRODUCT_LINKS.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </nav>

            <nav className="esti-landing-footer__nav" aria-label="Contact">
              <h2>Contact</h2>
              <Stack gap={3}>
                {CONTACT_LINKS.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </nav>

            <div className="esti-landing-footer__studio">
              <p className="esti-landing-footer__eyebrow">Developed by</p>
              <img
                src="/hcw-white.png"
                alt="Holagundi Consulting Works"
                className="esti-landing-footer__hcw"
              />
            </div>

            <div className="esti-landing-footer__bottom">
              <span>ESTI AORMS</span>
              <span>Architecture Office Resource Management System</span>
              <span>© Holagundi Consulting Works</span>
            </div>
          </footer>
        </LandingEditorial>
      </LandingBand>
    </Theme>
  );
}
