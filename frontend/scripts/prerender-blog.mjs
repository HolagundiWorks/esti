/**
 * Build-time blog prerender + SEO assets.
 *
 * Runs after `vite build`. Reads the compiled dist/index.html (the SPA shell with
 * hashed bundle tags) and, for the blog list and every post, writes a static HTML
 * file with real <head> meta, OpenGraph/Twitter tags, JSON-LD, and the article
 * content inside #root. Crawlers and social scrapers get full HTML without running
 * JS; when the bundle loads, React replaces #root with the live SPA.
 *
 * nginx serves these via its existing `try_files $uri $uri/ /index.html` rule
 * (dist/blog/<slug>/index.html). Also emits sitemap.xml.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const SITE = "https://aorms.in";
const SITE_NAME = "AORMS";

// The firm product build (VITE_PUBLIC_SITE=false) ships no marketing/blog, so there
// is nothing to prerender — skip cleanly.
if (process.env.VITE_PUBLIC_SITE === "false") {
  console.log("[prerender] skipped — non-public (firm product) build.");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const contentDir = join(root, "src", "content", "blog");
const landingDir = join(root, "src", "content", "landing");
const slugsPath = join(root, "src", "lib", "landing-slugs.ts");
const templatePath = join(distDir, "index.html");

if (!existsSync(templatePath)) {
  console.error("[prerender] dist/index.html not found — run `vite build` first.");
  process.exit(1);
}
const template = readFileSync(templatePath, "utf8");

// ── helpers ───────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[k] = v;
  }
  return { data, body: m[2] ?? "" };
}

function loadPosts() {
  return readdirSync(contentDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontmatter(readFileSync(join(contentDir, f), "utf8"));
      return {
        slug: data.slug || f.replace(/\.md$/, ""),
        title: data.title || f,
        date: data.date || "",
        excerpt: data.excerpt || "",
        author: data.author || SITE_NAME,
        coverImage: data.coverImage || "",
        draft: data.draft === "true",
        body,
      };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// Pull Q&A pairs out of a body's "Frequently asked questions" section — mirror of
// extractFaqs() in src/lib/landing-pages.ts (### question + following paragraphs).
function extractFaqs(body) {
  const faqs = [];
  let inFaq = false;
  let current = null;
  const flush = () => {
    if (current) {
      current.answer = current.answer.trim();
      if (current.question && current.answer) faqs.push(current);
    }
    current = null;
  };
  for (const line of body.split(/\r?\n/)) {
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h2 && !h3) {
      flush();
      inFaq = /frequently asked questions|faqs?\b/i.test(h2[1]);
      continue;
    }
    if (!inFaq) continue;
    if (h3) {
      flush();
      current = { question: h3[1].trim(), answer: "" };
      continue;
    }
    if (current) current.answer += `${line}\n`;
  }
  flush();
  return faqs;
}

function loadLanding() {
  if (!existsSync(landingDir)) return [];
  return readdirSync(landingDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontmatter(readFileSync(join(landingDir, f), "utf8"));
      const slug = data.slug || f.replace(/\.md$/, "");
      const title = data.title || slug;
      return {
        slug,
        title,
        metaTitle: data.metaTitle || title,
        metaDescription: data.metaDescription || data.intro || "",
        intro: data.intro || "",
        category: data.category || "solution",
        updated: data.updated || "",
        draft: data.draft === "true",
        faqs: extractFaqs(body),
        body,
      };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Fail the build if the markdown files and the App router's slug list drift apart —
// a slug in one but not the other means a page that 404s or is unreachable.
function assertSlugsInSync(landing) {
  if (!existsSync(slugsPath)) return;
  const src = readFileSync(slugsPath, "utf8");
  const arrMatch = /export const LANDING_SLUGS = \[([\s\S]*?)\] as const;/.exec(src);
  if (!arrMatch) return;
  const declared = new Set([...arrMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const files = new Set(landing.map((p) => p.slug));
  const missingFile = [...declared].filter((s) => !files.has(s));
  const missingSlug = [...files].filter((s) => !declared.has(s));
  if (missingFile.length || missingSlug.length) {
    console.error("[prerender] landing slug mismatch between landing-slugs.ts and src/content/landing/:");
    if (missingFile.length) console.error(`  declared but no .md file: ${missingFile.join(", ")}`);
    if (missingSlug.length) console.error(`  .md file but not declared: ${missingSlug.join(", ")}`);
    process.exit(1);
  }
}

// Patch the SPA shell's <head> + #root for one page.
function renderPage({ title, description, canonical, jsonLd, bodyHtml, image }) {
  let html = template;
  const set = (re, replacement) => {
    html = re.test(html) ? html.replace(re, replacement) : html;
  };
  const pageTitle = `${title} — ${SITE_NAME}`;
  const ogImage = image ? `${SITE}${image}` : `${SITE}/og-image.png`;

  set(/<title>[\s\S]*?<\/title>/i, `<title>${esc(pageTitle)}</title>`);
  set(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);
  set(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${esc(canonical)}$2`);
  set(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${esc(canonical)}$2`);
  set(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${esc(title)}$2`);
  set(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);
  set(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${esc(ogImage)}$2`);
  set(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${esc(title)}$2`);
  set(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, `$1${esc(description)}$2`);

  if (jsonLd) {
    const ld = JSON.stringify(jsonLd).replace(/<\//g, "<\\/");
    html = html.replace("</head>", `  <script type="application/ld+json">${ld}</script>\n</head>`);
  }
  // Inject crawlable content into #root (React replaces it on hydrate/render).
  html = html.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${bodyHtml}</div>`);
  return html;
}

function writePage(routePath, html) {
  const dir = join(distDir, routePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html, "utf8");
}

// ── build ───────────────────────────────────────────────────────────────────
const posts = loadPosts();

// Blog list page → dist/blog/index.html
const listBody = `<main class="esti-blog"><h1>Blog</h1><ul>${posts
  .map((p) => `<li><a href="/blog/${p.slug}"><strong>${esc(p.title)}</strong> — ${esc(p.excerpt)}</a></li>`)
  .join("")}</ul></main>`;
writePage(
  "blog",
  renderPage({
    title: "Blog",
    description: "Office intelligence, compliance, and delivery notes for Indian architecture practices, from the team building AORMS.",
    canonical: `${SITE}/blog`,
    jsonLd: null,
    bodyHtml: listBody,
  }),
);

// Each post → dist/blog/<slug>/index.html
for (const p of posts) {
  const articleHtml = `<main class="esti-blog"><article class="esti-blog-article"><h1>${esc(p.title)}</h1><p>${esc(p.date)} · ${esc(p.author)}</p>${marked.parse(p.body, { async: false })}</article></main>`;
  writePage(
    join("blog", p.slug),
    renderPage({
      title: p.title,
      description: p.excerpt,
      canonical: `${SITE}/blog/${p.slug}`,
      image: p.coverImage,
      bodyHtml: articleHtml,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            dateModified: p.date,
            author: { "@type": "Organization", name: p.author },
            publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE}/aorms-logo.png` } },
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${p.slug}` },
            ...(p.coverImage ? { image: `${SITE}${p.coverImage}` } : {}),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
              { "@type": "ListItem", position: 3, name: p.title, item: `${SITE}/blog/${p.slug}` },
            ],
          },
        ],
      },
    }),
  );
}

// Each keyword landing page → dist/<slug>/index.html
const landing = loadLanding();
assertSlugsInSync(landing);
for (const p of landing) {
  const url = `${SITE}/${p.slug}`;
  const introHtml = p.intro ? `<p class="esti-blog-article__byline">${esc(p.intro)}</p>` : "";
  const articleHtml = `<main class="esti-blog"><article class="esti-blog-article"><h1>${esc(p.title)}</h1>${introHtml}${marked.parse(p.body, { async: false })}</article></main>`;
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: p.metaTitle,
      description: p.metaDescription,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#software` },
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: p.title, item: url },
      ],
    },
  ];
  if (p.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: p.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
  writePage(
    p.slug,
    renderPage({
      title: p.metaTitle,
      description: p.metaDescription,
      canonical: url,
      bodyHtml: articleHtml,
      jsonLd: { "@context": "https://schema.org", "@graph": graph },
    }),
  );
}

// ── sitemap.xml ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE}/compliance-check`, lastmod: today, changefreq: "monthly", priority: "0.9" },
  { loc: `${SITE}/blog`, lastmod: posts[0]?.date || today, changefreq: "weekly", priority: "0.8" },
  ...landing.map((p) => ({ loc: `${SITE}/${p.slug}`, lastmod: p.updated || today, changefreq: "monthly", priority: "0.8" })),
  { loc: `${SITE}/legal`, lastmod: today, changefreq: "yearly", priority: "0.3" },
  ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.date || today, changefreq: "monthly", priority: "0.7" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
writeFileSync(join(distDir, "sitemap.xml"), sitemap, "utf8");

// ── llms.txt (AI / LLM crawler index) ─────────────────────────────────────────
const llms = `# AORMS — Architectural Office Resource Management System

> AORMS, by Holagundi Consulting Works, is an office intelligence system for Indian architecture practices. It unifies projects, drawings, revisions, COA fee proposals, GST invoicing, bylaw compliance, and client/contractor portals, and runs a cognition engine that observes the office, predicts risk, and recommends the next action. Built India-native: GST/SAC codes, the April–March year, BBMP and jurisdiction bylaws, and DSR rates.

## Product
- [AORMS home](${SITE}/): office cognition for architecture firms — observe, reason, predict, recommend.
- [Building compliance checker](${SITE}/compliance-check): free FAR, ground coverage and setback checker for BBMP (Bengaluru), with reference data for Mumbai, Delhi, Chennai, Hyderabad, Pune, Kolkata and Ahmedabad.
- [Live demo](${SITE}/demo): one-click demo workspace, no signup.

## Solutions
${landing.map((p) => `- [${p.title}](${SITE}/${p.slug}): ${p.metaDescription}`).join("\n")}

## Articles
${posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug}): ${p.excerpt}`).join("\n")}

## More
- [All articles](${SITE}/blog)
`;
writeFileSync(join(distDir, "llms.txt"), llms, "utf8");

console.log(`[prerender] ${posts.length} post(s) + blog index + sitemap.xml (${urls.length} urls) + llms.txt written to dist/`);
