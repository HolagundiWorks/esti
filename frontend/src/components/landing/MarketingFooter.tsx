import { LANDING_SEO } from "../../lib/landing-seo.js";
import { LANDING_NAV } from "../../lib/landing-slugs.js";
import { formatVisitCount } from "../../lib/landing-visit.js";

const PRODUCT_LINKS = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/download", label: "AORMS Estimate" },
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

/** Sitewide lp2 footer — solutions mesh + Radiant Orange bar (marketing pages only). */
export function MarketingFooter({
  visitCount,
}: {
  visitCount?: number | null;
}) {
  return (
    <footer className="lp2-footer" aria-label="AORMS footer">
      <nav className="lp2-footer__solutions" aria-label="Solutions">
        {LANDING_NAV.map((group) => (
          <div key={group.heading} className="lp2-footer__sol-col">
            <p className="lp2-footer__sol-head">{group.heading}</p>
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

      <div className="lp2-footer__bar">
        <div className="lp2-footer__brand">
          <span
            role="img"
            aria-label="AORMS"
            className="esti-brand esti-brand--aorms lp2-footer__logo"
          />
          <p>{LANDING_SEO.footerBlurb}</p>
        </div>

        <nav className="lp2-footer__col" aria-label="Product">
          <p className="lp2-footer__col-head">Product</p>
          <ul>
            {PRODUCT_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="lp2-footer__col" aria-label="Contact">
          <p className="lp2-footer__col-head">Contact</p>
          <ul>
            {CONTACT_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  {...(l.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {visitCount != null && visitCount > 0 ? (
          <p className="lp2-footer__visits">{formatVisitCount(visitCount)} visits</p>
        ) : null}
      </div>
    </footer>
  );
}

/** @deprecated Use MarketingFooter — kept for Landing.tsx import stability. */
export const LandingFooter = MarketingFooter;
