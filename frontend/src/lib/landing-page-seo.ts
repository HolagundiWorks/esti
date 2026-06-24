/** Per-route SEO for keyword landing pages — sets document title, meta tags,
 *  canonical and JSON-LD (WebPage + FAQPage + BreadcrumbList). Mirrors the
 *  baked-in tags produced by scripts/prerender-blog.mjs so the client render and
 *  the prerendered HTML stay in sync. Keep selectors aligned with index.html. */
import type { LandingPage } from "./landing-pages.js";

const SITE = "https://aorms.in";
const SITE_NAME = "AORMS";

function setMeta(selector: string, attr: "content" | "href", value: string): void {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function setJsonLd(data: object | null): void {
  const id = "esti-landing-jsonld";
  document.getElementById(id)?.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function landingJsonLd(page: LandingPage): object {
  const url = `${SITE}/${page.slug}`;
  const graph: object[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.metaTitle,
      description: page.metaDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#software` },
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: page.title, item: url },
      ],
    },
  ];
  if (page.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function applyLandingPageSeo(page: LandingPage): void {
  const url = `${SITE}/${page.slug}`;
  document.title = `${page.metaTitle} — ${SITE_NAME}`;
  setMeta('meta[name="description"]', "content", page.metaDescription);
  setMeta('meta[property="og:title"]', "content", page.metaTitle);
  setMeta('meta[property="og:description"]', "content", page.metaDescription);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[name="twitter:title"]', "content", page.metaTitle);
  setMeta('meta[name="twitter:description"]', "content", page.metaDescription);
  setMeta('link[rel="canonical"]', "href", url);
  setJsonLd(landingJsonLd(page));
}
