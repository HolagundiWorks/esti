import { useEffect } from "react";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
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
    const title = "About AORMS — built by an architecture practice, for Indian practices";
    const description =
      "AORMS is built by Holagundi Consulting Works for Indian architecture practices — projects, drawings, revisions, COA fees and GST billing on one honest record. Meet the team and the thinking behind it.";
    document.title = `${title} — AORMS`;
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
          name: "Holagundi Consulting Works",
          alternateName: "AORMS",
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
            "Architecture practice management",
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
      <MarketingShell>
        <main id="main-content" className="esti-blog">
          <header className="esti-blog__head">
            <h1>About AORMS</h1>
            <p>
              Built by an architecture practice's operations discipline, for Indian architecture
              practices — one honest record for projects, drawings, revisions, fees and billing.
            </p>
          </header>

          <article className="esti-blog-article">
            <div className="esti-blog-article__body">
              <h2>Who makes AORMS</h2>
              <p>
                AORMS — the Architecture Office Resource Management System — is designed and built by{" "}
                <strong>Holagundi Consulting Works</strong>, based in Hospet, Karnataka. It is not a
                generic project tool retro-fitted to architecture. Every screen is shaped around how
                an Indian consultancy practice actually runs: enquiry to fee proposal, concept to
                working drawings, statutory approvals, revisions, GST invoicing, and site
                supervision — on one project record.
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
                <a href="/account?mode=create">create your AORMS account</a> and try it on a
                real project.
              </p>
              <p>
                Holagundi Consulting Works · Hospet, Karnataka, India<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · +91 89510 89191
              </p>
            </div>
          </article>
        </main>
        <MarketingFooter />
      </MarketingShell>
  );
}
