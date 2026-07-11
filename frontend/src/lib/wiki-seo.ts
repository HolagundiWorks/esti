import type { WikiPage } from "./wiki.js";
import { AORMS_STUDIO, AORMS_PLATFORM } from "./product-nomenclature.js";
import { wikiPageUrl } from "./wiki-url.js";

const SITE_NAME = "AORMS Wiki";

function setMeta(selector: string, attr: "content" | "href", value: string): void {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function setJsonLd(data: object | null): void {
  const id = "esti-wiki-jsonld";
  document.getElementById(id)?.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function applyWikiListSeo(): void {
  const title = `${SITE_NAME} — central documentation`;
  const description =
    `Central ${AORMS_PLATFORM.name} documentation: HCW-UI design system, ${AORMS_STUDIO.title}, AI core (EmOI + ESTI), and office management for Indian architecture consultancies.`;
  const url = wikiPageUrl();
  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", url);
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description,
    publisher: { "@type": "Organization", name: "Human Centric Works" },
  });
}

export function applyWikiPageSeo(page: WikiPage): void {
  const title = `${page.title} — ${SITE_NAME}`;
  const url = wikiPageUrl(page.slug === "index" ? undefined : page.slug);
  const description = page.excerpt || `${page.title} — ${AORMS_STUDIO.title} documentation.`;
  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", page.title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[name="twitter:title"]', "content", page.title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", url);
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description,
    dateModified: page.updated || undefined,
    author: { "@type": "Organization", name: "Human Centric Works" },
    publisher: { "@type": "Organization", name: "AORMS" },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  });
}
