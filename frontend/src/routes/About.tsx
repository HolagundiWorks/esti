import { useEffect } from "react";
import { AORMS_STUDIO, AORMS_PLATFORM, EMOI } from "../lib/product-nomenclature.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";

const CONTACT_EMAIL = "hi@aorms.in";
const SITE = "https://aorms.in";

/**
 * About / E-E-A-T page — who builds AORMS and the expertise behind it. Public,
 * crawlable, single H1. Emits AboutPage + Organization JSON-LD so search
 * engines can attribute the content to a real operator. No fabricated
 * testimonials, logos, or statistics — that is a stated brand stance.
 */
export function About() {
  useEffect(() => {
    const title = `About ${AORMS_PLATFORM.name} — platform and ${AORMS_STUDIO.title}`;
    const description =
      `${AORMS_PLATFORM.name} (${AORMS_PLATFORM.expansion}) — operational and design frameworks for advisory consulting offices. ${AORMS_STUDIO.title} is the shipping architecture workspace for Indian consultancies. Built by Human Centric Works.`;
    document.title = `${title} — ${AORMS_PLATFORM.name}`;
    const set = (sel: string, attr: "content" | "href", val: string) =>
      document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:url"]', "content", `${SITE}/about`);
    set('link[rel="canonical"]', "href", `${SITE}/about`);

    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "AboutPage",
          "@id": `${SITE}/about#webpage`,
          url: `${SITE}/about`,
          name: title,
          description,
          inLanguage: "en-IN",
          isPartOf: { "@id": `${SITE}/#website` },
          about: { "@id": `${SITE}/#organization` },
          publisher: { "@id": `${SITE}/#organization` },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
            { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about` },
          ],
        },
        {
          "@type": "Organization",
          "@id": `${SITE}/#organization`,
          name: "Human Centric Works",
          alternateName: [AORMS_PLATFORM.name, AORMS_STUDIO.title],
          url: SITE,
          email: CONTACT_EMAIL,
          telephone: "+91-89510-89191",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Hospet",
            addressRegion: "Karnataka",
            addressCountry: "IN",
          },
          areaServed: "IN",
          knowsAbout: [
            AORMS_PLATFORM.expansion,
            EMOI.expansion,
            "Operational framework",
            "Design framework",
            "Advisory consulting",
            "Architecture consultancy operations",
            "COA fee stages",
            "GST invoicing for architecture services",
            "Design revision tracking",
            "Drawing approval workflows",
          ],
        },
      ],
    };
    const id = "esti-about-jsonld";
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => document.getElementById(id)?.remove();
  }, []);

  return (
    <MarketingShell contours tagline="About AORMS">
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">About</p>
          <h1 className="lp2-section-head__title">About {AORMS_PLATFORM.name}</h1>
          <p className="lp2-section-head__body">
            Operational and design frameworks for consulting offices that advise — with{" "}
            <strong>{AORMS_STUDIO.title}</strong> as the first live workspace for Indian
            architecture consultancies.
          </p>
        </header>

        <article className="lp2-seo-article lp2-reveal">
          <div className="lp2-seo-article__body lp2-prose">
              <h2>The platform</h2>
              <p>
                <strong>{AORMS_PLATFORM.name}</strong> ({AORMS_PLATFORM.expansion}) gives advisory
                consulting offices an <strong>operational framework</strong> (how the practice runs)
                and a <strong>design framework</strong> (how engagements are structured) on one spine,
                governed by <strong>{EMOI.name}</strong> ({EMOI.expansion}). We are not in solution
                delivery or client project management.
              </p>
              <p>
                <a href="/">Platform home</a> · <a href="/wiki/aorms-studio">Wiki</a> ·{" "}
                <a href="/blog/aorms-platform-operational-design-frameworks">Platform overview (blog)</a>
              </p>

              <h2>Who makes {AORMS_STUDIO.title}</h2>
              <p>
                <strong>{AORMS_STUDIO.title}</strong> — the architecture vertical on{" "}
                <strong>{AORMS_PLATFORM.name}</strong> ({AORMS_PLATFORM.expansion}) — is designed
                and built by <strong>Human Centric Works</strong>, based in Hospet,
                Karnataka. It is not a generic project tool retro-fitted to architecture. Every
                screen is shaped around how an Indian consultancy practice actually runs: enquiry to
                fee proposal, concept to working drawings, statutory approvals, revisions, GST
                invoicing, and site supervision — on one project record.
              </p>

              <h2>Why we built it</h2>
              <p>
                Architecture firms rarely fail at design. They lose money and calm in the{" "}
                <em>operational gaps</em> — the client change that was agreed across a table but
                never written down, the COA stage that was delivered but never invoiced, the drawing
                revision nobody can find, the approval that lives in someone's memory. Generic
                project-management tools do not understand COA fee stages, GST and SAC codes, the
                Indian financial year, or a drawing register. So we built the system we wished
                existed — one that treats the office record as the product.
              </p>

              <h2>What we believe</h2>
              <ul>
                <li>
                  <strong>Honesty over hype.</strong> We do not publish fabricated testimonials,
                  invented logos, or made-up statistics. When AORMS is early in an area, we say so.
                </li>
                <li>
                  <strong>India first.</strong> COA fee scales, CGST/SGST/IGST, SAC 998321, the April–March
                  financial year, and 26AS / AIS / GSTR reconciliation are native — not bolted on.
                </li>
                <li>
                  <strong>Deterministic systems you can audit.</strong> The numbers — office
                  health, revision intelligence, performance scores — are computed from your live
                  record by transparent rules you can trace, not a black-box model.
                </li>
                <li>
                  <strong>Your data is yours.</strong> Projects, drawings, invoices and client data
                  remain yours; the paid edition and self-hosted deployments are never used to train
                  our models.
                </li>
              </ul>

              <h2>What AORMS covers</h2>
              <p>
                Projects, phases and tasks on one record; a controlled drawing register with
                transmittals and{" "}
                <a href="/architecture-approval-workflow-software">approval workflows</a>;{" "}
                <a href="/architecture-revision-tracking">revision tracking</a> that classifies every
                change by category and source;{" "}
                <a href="/architect-fee-proposal-software">COA fee proposals</a> and{" "}
                <a href="/gst-billing-software-architects-india">GST billing</a> with reconciliation;
                a <a href="/architecture-client-portal-software">client portal</a> for approvals and
                minutes; consultant coordination; site supervision; team, attendance and fair
                performance scoring; and a versioned{" "}
                <a href="/libraries/spec-catalog">specification catalogue</a> for project spec sheets.
              </p>

              <h2>Editions</h2>
              <p>
                AORMS ships as <strong>one standard licence</strong> — the full workspace with
                5 GB storage included and unlimited users. You pay for extra storage and hosted
                AI usage, or bring your own API key. Read more in our{" "}
                <a href="/blog">writing on architecture practice operations</a>.
              </p>

              <h2>Talk to us</h2>
              <p>
                We would rather have a real conversation than a sales funnel. Write to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or{" "}
                <strong>Create account</strong> in the dock below and try it on a real project.
              </p>
              <p>
                Human Centric Works · Hospet, Karnataka, India<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · +91 89510 89191
              </p>
            </div>
          </article>
      </div>
    </MarketingShell>
  );
}
