/** Per-route blog SEO — sets document title, meta tags, canonical and JSON-LD.
 *  These are read by crawlers that execute JS and are baked in by the build-time
 *  prerender step (see deploy notes). Keep selectors in sync with index.html. */
import type { BlogPost } from "./blog.js";

const SITE = "https://aorms.in";
const SITE_NAME = "AORMS";

function setMeta(selector: string, attr: "content" | "href", value: string): void {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function setJsonLd(data: object | null): void {
  const id = "esti-blog-jsonld";
  document.getElementById(id)?.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function applyBlogListSeo(): void {
  const title = `Blog — ${SITE_NAME}`;
  const description =
    "Notes on office intelligence, revisions, approvals, GST workflows, billing, and delivery for Indian architecture practices. Product docs: wiki.aorms.in.";
  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", `${SITE}/blog`);
  setJsonLd(null);
}

export function applyBlogPostSeo(post: BlogPost): void {
  const title = `${post.title} — ${SITE_NAME}`;
  const url = `${SITE}/blog/${post.slug}`;
  document.title = title;
  setMeta('meta[name="description"]', "content", post.excerpt);
  setMeta('meta[property="og:title"]', "content", post.title);
  setMeta('meta[property="og:description"]', "content", post.excerpt);
  setMeta('meta[name="twitter:title"]', "content", post.title);
  setMeta('meta[name="twitter:description"]', "content", post.excerpt);
  setMeta('link[rel="canonical"]', "href", url);

  setJsonLd({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author ?? SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.coverImage ? { image: `${SITE}${post.coverImage}` } : {}),
  });
}
