/**
 * Markdown-backed blog. Posts live as `src/content/blog/<slug>.md` with YAML-ish
 * frontmatter and are bundled at build time — no DB, no CMS, no runtime fetch.
 * Publishing a post = add a `.md` file and redeploy.
 */

// Raw markdown for every post, keyed by file path (eager so listing is sync).
const files = import.meta.glob("../content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export interface BlogPost {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  excerpt: string;
  tags: string[];
  author?: string;
  coverImage?: string;
  draft: boolean;
  readingMinutes: number;
  markdown: string; // body, frontmatter stripped
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

function slugFromPath(path: string): string {
  return (path.split("/").pop() ?? "").replace(/\.md$/, "");
}

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function toPost(path: string, raw: string): BlogPost {
  const { data, body } = parseFrontmatter(raw);
  const slug = data.slug || slugFromPath(path);
  return {
    slug,
    title: data.title || slug,
    date: data.date || "",
    excerpt: data.excerpt || "",
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    author: data.author || undefined,
    coverImage: data.coverImage || undefined,
    draft: data.draft === "true",
    readingMinutes: readingMinutes(body),
    markdown: body,
  };
}

// Drafts are visible in dev, hidden in production builds.
const ALL: BlogPost[] = Object.entries(files)
  .map(([path, raw]) => toPost(path, raw))
  .filter((p) => (import.meta.env.PROD ? !p.draft : true))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function listPosts(): BlogPost[] {
  return ALL;
}

export function getPost(slug: string): BlogPost | undefined {
  return ALL.find((p) => p.slug === slug);
}

/** Posts are ordered newest→oldest, so `newer` is the previous index and `older` the next. */
export function getAdjacentPosts(slug: string): { newer?: BlogPost; older?: BlogPost } {
  const i = ALL.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return { newer: ALL[i - 1], older: ALL[i + 1] };
}

export function formatPostDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
