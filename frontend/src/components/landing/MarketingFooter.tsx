import { Link, Stack } from "@mui/material";
import { LANDING_SEO } from "../../lib/landing-seo.js";
import { LANDING_NAV } from "../../lib/landing-slugs.js";
import { formatVisitCount } from "../../lib/landing-visit.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const PRODUCT_LINKS = [
  { href: "/#platform", label: "Platform" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/#trial", label: "Request access" },
] as const;

const CONTACT_LINKS = [
  { href: "mailto:hi@aorms.in", label: "hi@aorms.in" },
  { href: "tel:+918951089191", label: "+91 89510 89191" },
  { href: "https://www.linkedin.com/company/aorms", label: "LinkedIn" },
  { href: "/investors", label: "Investors" },
  { href: "/legal", label: "Legal" },
  { href: "/login", label: "Workspace sign in" },
  { href: "/access", label: "Portal access (clients / contractors)" },
] as const;

export function MarketingFooter({
  visitCount,
}: {
  visitCount?: number | null;
}) {
  return (
    <LandingBand className="esti-landing-footer">
      <LandingEditorial>
        {/* Sitewide solutions mesh — links every keyword landing page from every
            marketing/blog page so authority is distributed and no page is orphaned. */}
        <nav className="esti-landing-footer__solutions" aria-label="Solutions">
          {LANDING_NAV.map((group) => (
            <div key={group.heading} className="esti-landing-footer__solcol">
              <h2>{group.heading}</h2>
              <ul>
                {group.links.map((l) => (
                  <li key={l.slug}>
                    <a href={`/${l.slug}`}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <footer className="esti-landing-footer__grid" aria-label="AORMS footer">
            <div className="esti-landing-footer__brand">
              <span
                role="img"
                aria-label="AORMS"
                className="esti-landing-footer__aorms esti-brand esti-brand--aorms"
              />
              <p>{LANDING_SEO.footerBlurb}</p>
            </div>

            <nav className="esti-landing-footer__nav" aria-label="Product">
              <h2>Product</h2>
              <Stack spacing={1.5}>
                {PRODUCT_LINKS.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </nav>

            <nav className="esti-landing-footer__nav" aria-label="Contact">
              <h2>Contact</h2>
              <Stack spacing={1.5}>
                {CONTACT_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    {...(item.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </nav>

            {/* "Developed by" + the AORMS identity section moved to the fixed rail
                (MarketingShell). Only the visit counter remains here. */}
            {visitCount != null && visitCount > 0 ? (
              <div className="esti-landing-footer__bottom">
                <span className="esti-landing-footer__visits">
                  {formatVisitCount(visitCount)} visits
                </span>
              </div>
            ) : null}
          </footer>
        </LandingEditorial>
      </LandingBand>
  );
}
