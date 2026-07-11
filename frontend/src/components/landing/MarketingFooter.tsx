import { ARCHITECTURE_LANDING_SEO } from "../../lib/architecture-landing-seo.js";
import { LANDING_SEO } from "../../lib/landing-seo.js";
import { formatVisitCount } from "../../lib/landing-visit.js";
import { HcwAttribution } from "../brand/HcwAttribution.js";

const PLATFORM_LINKS = [
  { href: "/wiki", label: "Wiki" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/legal", label: "Legal" },
  { href: "mailto:hi@aorms.in", label: "hi@aorms.in" },
] as const;

const ARCHITECTURE_LINKS = [
  { href: "/wiki", label: "Wiki" },
  { href: "/login", label: "Sign in" },
  { href: "/legal", label: "Legal" },
  { href: "mailto:hi@aorms.in", label: "hi@aorms.in" },
] as const;

/** Sitewide marketing footer — flat hairline bar; conversion CTAs live in ActionDock. */
export function MarketingFooter({
  visitCount,
  variant = "platform",
}: {
  visitCount?: number | null;
  variant?: "platform" | "architecture";
}) {
  const links = variant === "architecture" ? ARCHITECTURE_LINKS : PLATFORM_LINKS;
  const footerBlurb =
    variant === "architecture" ? ARCHITECTURE_LANDING_SEO.footerBlurb : LANDING_SEO.footerBlurb;

  return (
    <footer className="lp2-footer" aria-label="AORMS footer">
      <a href="/#top" className="lp2-footer__brand" aria-label="AORMS home">
        <span
          role="img"
          aria-label="AORMS"
          className="esti-brand esti-brand--aorms lp2-footer__logo"
        />
      </a>
      <p className="lp2-footer__blurb">{footerBlurb}</p>
      <nav className="lp2-footer__links" aria-label="Footer links">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            {...(l.href.startsWith("mailto:")
              ? {}
              : l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
          >
            {l.label}
          </a>
        ))}
      </nav>
      <HcwAttribution variant="footer" />
      {visitCount != null && visitCount > 0 ? (
        <p className="lp2-footer__visits">{formatVisitCount(visitCount)} visits</p>
      ) : null}
    </footer>
  );
}

/** @deprecated Use MarketingFooter — kept for Landing.tsx import stability. */
export const LandingFooter = MarketingFooter;
