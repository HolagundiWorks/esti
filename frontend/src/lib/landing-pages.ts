/**
 * Markdown-backed SEO landing pages (Phase 3 / 9 / 10 of the AORMS SEO roadmap).
 *
 * Each high-intent keyword gets one page at a top-level slug (e.g.
 * `/architecture-office-management-software`). Pages live as
 * `src/content/landing/<slug>.md` with YAML-ish frontmatter and are bundled at
 * build time — no DB, no CMS, no runtime fetch — exactly like the blog.
 *
 * Publishing a page = add a `.md` file and redeploy. The build-time prerender
 * (scripts/prerender-blog.mjs) emits a crawlable static `dist/<slug>/index.html`
 * for each and lists every slug in sitemap.xml.
 */

// Raw markdown for every landing page, keyed by file path (eager so listing is sync).
const files = import.meta.glob("../content/landing/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export type LandingCategory = "solution" | "moat" | "india";

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingPage {
  slug: string;
  /** Visible <h1> and primary heading. */
  title: string;
  /** <title> tag — defaults to title if absent. */
  metaTitle: string;
  metaDescription: string;
  /** Primary target keyword for this page. */
  keyword: string;
  /** Lead paragraph rendered above the body and used as the OG description fallback. */
  intro: string;
  category: LandingCategory;
  /** ISO yyyy-mm-dd of last meaningful edit (drives sitemap lastmod). */
  updated: string;
  draft: boolean;
  /** Q&A pairs parsed from the "Frequently asked questions" section (FAQ schema). */
  faqs: LandingFaq[];
  /** Body markdown, frontmatter stripped. */
  markdown: string;
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: match[2] ?? "" };
}

/**
 * Pull Q&A pairs out of the body's "Frequently asked questions" section. Each
 * `### Question` heading starts a question; the following paragraphs (until the
 * next `###`/`##`) are its answer. Shared convention with prerender-blog.mjs.
 */
export function extractFaqs(body: string): LandingFaq[] {
  const lines = body.split(/\r?\n/);
  const faqs: LandingFaq[] = [];
  let inFaq = false;
  let current: LandingFaq | null = null;
  const flush = () => {
    if (current) {
      current.answer = current.answer.trim();
      if (current.question && current.answer) faqs.push(current);
    }
    current = null;
  };
  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h2 && !h3) {
      // A new ## section ends the FAQ block.
      flush();
      inFaq = /frequently asked questions|faqs?\b/i.test(h2[1]!);
      continue;
    }
    if (!inFaq) continue;
    if (h3) {
      flush();
      current = { question: h3[1]!.trim(), answer: "" };
      continue;
    }
    if (current) current.answer += `${line}\n`;
  }
  flush();
  return faqs;
}

function toPage(path: string, raw: string): LandingPage {
  const { data, body } = parseFrontmatter(raw);
  const slug = data.slug || (path.split("/").pop() ?? "").replace(/\.md$/, "");
  const title = data.title || slug;
  const category = (data.category as LandingCategory) || "solution";
  return {
    slug,
    title,
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.intro || "",
    keyword: data.keyword || title,
    intro: data.intro || "",
    category: ["solution", "moat", "india"].includes(category) ? category : "solution",
    updated: data.updated || "",
    draft: data.draft === "true",
    faqs: extractFaqs(body),
    markdown: body,
  };
}

// Drafts are visible in dev, hidden in production builds.
const ALL: LandingPage[] = Object.entries(files)
  .map(([path, raw]) => toPage(path, raw))
  .filter((p) => (import.meta.env.PROD ? !p.draft : true))
  .sort((a, b) => a.title.localeCompare(b.title));

export function listLandingPages(): LandingPage[] {
  return ALL;
}

export function getLandingPage(slug: string): LandingPage | undefined {
  return ALL.find((p) => p.slug === slug);
}

/** Slugs that App.tsx routes to SeoLanding — used to gate the public router. */
export const LANDING_SLUGS: ReadonlySet<string> = new Set(ALL.map((p) => p.slug));

const CATEGORY_LABEL: Record<LandingCategory, string> = {
  solution: "Platform",
  moat: "Revision & approvals",
  india: "India desk",
};

export function landingCategoryLabel(category: LandingCategory): string {
  return CATEGORY_LABEL[category];
}
