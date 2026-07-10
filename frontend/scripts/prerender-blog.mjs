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
const WIKI_SITE = "https://wiki.aorms.in";
const SITE_NAME = "AORMS";
const HOME_SEO = {
  title: "AORMS | Practice management software for architects & designers in India",
  description:
    "AORMS is the cloud practice OS for Indian architects and interior designers — fee recovery (what to invoice, next payment stage, incoming, due dates), MoM-led client revisions, GST billing, drawings, studio load and portals. One licence, 5 GB included, unlimited users. Docs: wiki.aorms.in.",
  canonical: `${SITE}/`,
};

// The firm product build (VITE_PUBLIC_SITE=false) ships no marketing/blog, so there
// is nothing to prerender — skip cleanly.
if (process.env.VITE_PUBLIC_SITE === "false") {
  console.log("[prerender] skipped — non-public (firm product) build.");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const contentDir = join(root, "src", "content", "blog");
const wikiDir = join(root, "src", "content", "wiki");
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
        tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
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

function loadWiki() {
  if (!existsSync(wikiDir)) return [];
  return readdirSync(wikiDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontmatter(readFileSync(join(wikiDir, f), "utf8"));
      const slug = data.slug || f.replace(/\.md$/, "");
      return {
        slug,
        title: data.title || slug,
        excerpt: data.excerpt || "",
        updated: data.updated || "",
        draft: data.draft === "true",
        body,
      };
    })
    .filter((p) => !p.draft && p.slug !== "index");
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
function renderPage({ title, description, canonical, jsonLd, bodyHtml, image, exactTitle = false }) {
  let html = template;
  const set = (re, replacement) => {
    html = re.test(html) ? html.replace(re, replacement) : html;
  };
  const pageTitle = exactTitle ? title : `${title} — ${SITE_NAME}`;
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
const wikiPages = loadWiki();
const landing = loadLanding();
assertSlugsInSync(landing);

// Homepage → dist/index.html. This gives browsers, text-only readers, Google and
// AI crawlers a meaningful document before React loads the visual Carbon UI.
const homeFeatureLinks = [
  ["Fee recovery", "/architect-fee-proposal-software", "See what needs invoicing, the next COA payment stage, incoming receipts and due dates — GST invoices and filing reminders on the same trail."],
  ["Client revisions from MoM", "/client-revision-management-for-architects", "Meeting → minutes → ESTI extracts → client request → architect marks criticality → client approves → then site moves."],
  ["Minutes of meeting", "/minutes-of-meeting-software-for-architects", "Issue MoM on the project record; ESTI drafts revision requests the client reviews and sends."],
  ["Project and phase management", "/architecture-project-management-software", "Keep enquiries, phases, drawings, site notes and handover evidence attached to one project record."],
  ["Document approvals", "/architect-document-approval-system", "Track what was issued, reviewed, approved and changed without losing decisions in chat threads."],
  ["COA-compliant billing", "/coa-compliant-billing-software", "Structure fees on the COA Scale of Charges and bill when stages are delivered, with GST and TDS on the record."],
  ["Studio Intelligence", "/architecture-erp-india", "See what moved, what is blocked, what needs invoicing, what needs approval and who owns the next action."],
  ["ESTI AI assistant", "/architecture-office-management-software", "Ask ESTI reads your office record to explain fee stages, MoM revisions and site progress — BYO API key supported."],
  ["Indian architecture practice workflows", "/architecture-office-management-india", "Work with GST, COA fee logic, MoM-led revisions, client approvals and practice-specific office records."],
];
const homeArticleGroups = [
  {
    heading: "Office essays",
    tags: ["Operations", "Practice", "Product", "Team", "Vision", "Story", "Demo", "Design", "Cognition", "Security", "AI"],
    excludeTags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings", "India", "Finance"],
  },
  {
    heading: "Change and approval notes",
    tags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings"],
    excludeTags: [],
  },
  {
    heading: "Indian practice notes",
    tags: ["India", "Finance"],
    excludeTags: ["Revisions", "Approvals", "Workflow", "Client", "Drawings"],
  },
].map((group) => {
  const wanted = new Set(group.tags);
  const blocked = new Set(group.excludeTags);
  return {
    ...group,
    posts: posts
      .filter((p) => p.tags.some((tag) => wanted.has(tag)) && !p.tags.some((tag) => blocked.has(tag)))
      .slice(0, 5),
  };
}).filter((group) => group.posts.length > 0);
const homeArticleHtml = homeArticleGroups.length
  ? `<section><h2>Practice notes</h2><p>Read after the product has introduced itself: articles grouped by how an architecture office thinks about practice, revisions, approvals and Indian operating context.</p>${homeArticleGroups.map((group) => `<article><h3>${esc(group.heading)}</h3><ul>${group.posts.map((p) => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a></li>`).join("")}</ul></article>`).join("")}</section>`
  : "";
const homeBody = `<header><nav aria-label="Primary"><a href="/">AORMS</a> <a href="/blog">Blog</a> <a href="/demo">Demo</a> <a href="/#trial">Request workspace</a> <a href="/sitemap.xml">Sitemap</a> <a href="/llms.txt">llms.txt</a></nav></header><main><section><h1>AORMS — Architecture Office Resource Management System</h1><p>AORMS is architecture office management software built for Indian architects, solo practices, and small to mid-sized architecture firms.</p><p>Architecture firms do not fail because they cannot design. They lose time, money and peace because office memory is scattered across WhatsApp messages, spreadsheets, verbal approvals, fee trackers and repeated follow-ups.</p><p>AORMS helps the office remember, track, warn, record and move work forward before chaos becomes cost.</p><p><a href="/demo">Open the working demo</a> <a href="/#trial">Request workspace</a></p></section><section><h2>Morning view</h2><p>When a principal opens AORMS in the morning, the office is already assembled: what moved, what is blocked, what needs approval, what is billable, and who owns the next action.</p></section><section><h2>Work in motion</h2><p>Every enquiry, drawing, revision, approval, site note, bill and client decision stays attached to the project record. Architecture work does not need to break into disconnected fragments.</p></section><section><h2>Core capabilities</h2>${homeFeatureLinks.map(([title, href, text]) => `<article><h3><a href="${href}">${title}</a></h3><p>${text}</p></article>`).join("")}</section><section><h2>Revision intelligence</h2><p>Client-driven changes, internal corrections, technical queries and scope changes can carry fee and time impact. AORMS keeps the reason, approval record and follow-up action visible.</p><p>Meeting minutes feed the same record: architects issue minutes of meeting to the client portal, and ESTI reads them to draft the client's formal revision requests — categorised, editable, and sent only when the client approves. Clients stop avoiding change requests; offices stop absorbing undocumented revisions.</p></section><section><h2>Stakeholder access</h2><p>The owner sees the office. Finance sees billing and GST. The team sees assigned work. Clients see project approvals. Contractors see only tender or bid scope. Visibility is controlled without splitting the record.</p></section>${homeArticleHtml}</main><footer><p>AORMS is built by Holagundi Consulting Works in Hospet, Karnataka, for architecture practices that want their office to run with the same discipline as their drawings.</p><p><a href="mailto:hi@aorms.in">hi@aorms.in</a></p></footer>`;
writeFileSync(
  join(distDir, "index.html"),
  renderPage({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    canonical: HOME_SEO.canonical,
    exactTitle: true,
    bodyHtml: homeBody,
    // The homepage template (frontend/index.html) already ships the canonical
    // WebSite + Organization + SoftwareApplication (with Offers) + FAQPage graph.
    // Emitting a second, leaner graph here produced competing #website/#organization/
    // #software nodes on the served page — so the home render adds no JSON-LD and
    // the rich template block stands as the single source of truth.
    jsonLd: null,
  }),
  "utf8",
);

// Blog list page → dist/blog/index.html
const listBody = `<main class="esti-blog"><h1>Blog</h1><ul>${posts
  .map((p) => `<li><a href="/blog/${p.slug}"><strong>${esc(p.title)}</strong> — ${esc(p.excerpt)}</a></li>`)
  .join("")}</ul></main>`;
writePage(
  "blog",
  renderPage({
    title: "Blog",
    description: "Office intelligence, revisions, approvals, billing, and delivery notes for Indian architecture practices.",
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

// Wiki index + pages → dist/wiki/ (aorms.in/wiki and wiki.aorms.in)
const wikiIndexBody = `<main class="esti-wiki"><h1>AORMS Wiki</h1><p>Official documentation for the AORMS cloud workspace.</p><ul>${wikiPages
  .map((p) => `<li><a href="/${p.slug}"><strong>${esc(p.title)}</strong> — ${esc(p.excerpt)}</a></li>`)
  .join("")}</ul></main>`;
writePage(
  "wiki",
  renderPage({
    title: "AORMS Wiki",
    description: "How to use AORMS — workflows, fee recovery, revisions, finance, and account setup.",
    canonical: `${WIKI_SITE}/`,
    bodyHtml: wikiIndexBody,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AORMS Wiki",
      url: WIKI_SITE,
    },
  }),
);

for (const p of wikiPages) {
  const articleHtml = `<main class="esti-wiki"><article class="esti-wiki-article"><h1>${esc(p.title)}</h1>${marked.parse(p.body, { async: false })}</article></main>`;
  writePage(
    join("wiki", p.slug),
    renderPage({
      title: p.title,
      description: p.excerpt,
      canonical: `${WIKI_SITE}/${p.slug}`,
      bodyHtml: articleHtml,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: p.title,
        description: p.excerpt,
        dateModified: p.updated || undefined,
        mainEntityOfPage: { "@type": "WebPage", "@id": `${WIKI_SITE}/${p.slug}` },
      },
    }),
  );
}

// Each keyword landing page → dist/<slug>/index.html
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
  { loc: `${SITE}/blog`, lastmod: posts[0]?.date || today, changefreq: "weekly", priority: "0.8" },
  { loc: `${WIKI_SITE}/`, lastmod: today, changefreq: "weekly", priority: "0.9" },
  ...wikiPages.map((p) => ({
    loc: `${WIKI_SITE}/${p.slug}`,
    lastmod: p.updated || today,
    changefreq: "weekly",
    priority: "0.85",
  })),
  { loc: `${SITE}/wiki`, lastmod: today, changefreq: "weekly", priority: "0.7" },
  ...landing.map((p) => ({ loc: `${SITE}/${p.slug}`, lastmod: p.updated || today, changefreq: "monthly", priority: "0.8" })),
  { loc: `${SITE}/about`, lastmod: today, changefreq: "monthly", priority: "0.6" },
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
const llms = `# AORMS

AORMS stands for Architecture Office Resource Management System.

AORMS is architecture office management software for Indian architecture firms, solo architects, and small practices.

Core capabilities:
- Fee recovery — what needs invoicing, next payment stage, incoming receipts, due dates, GST reminders
- Client revision management — MoM → ESTI extracts → client request → architect marks criticality → client approves → then site
- Meeting minutes on the project record with ESTI-drafted revision requests
- Drawing register, transmittals and client approval workflows
- COA fee proposals and GST invoicing with reconciliation
- Studio Intelligence dashboard and Ask ESTI (BYO API key supported)
- Official documentation at wiki.aorms.in
- Cloud browser workspace at aorms.in — one standard licence, unlimited users, 5 GB included storage

Website:
${SITE}

## Public Pages
- [AORMS home](${SITE}/)
- [AORMS Wiki](${WIKI_SITE}/)
- [Blog](${SITE}/blog)
- [Live demo](${SITE}/demo)

## Solutions
${landing.map((p) => `- [${p.title}](${SITE}/${p.slug}): ${p.metaDescription}`).join("\n")}

## Wiki (official product documentation)
${wikiPages.map((p) => `- [${p.title}](${WIKI_SITE}/${p.slug}): ${p.excerpt}`).join("\n")}

## Articles
${posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug}): ${p.excerpt}`).join("\n")}

## More
- [All articles](${SITE}/blog)
`;
writeFileSync(join(distDir, "llms.txt"), llms, "utf8");

console.log(`[prerender] ${posts.length} post(s) + ${wikiPages.length} wiki page(s) + blog index + sitemap.xml (${urls.length} urls) + llms.txt written to dist/`);
