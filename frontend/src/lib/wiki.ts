import { AORMS_STUDIO, isAormsStudioLegacySlug } from "./product-nomenclature.js";
import type { WikiHubId } from "./wiki-hub.js";
import { resolveWikiHubSlug, WIKI_HUBS } from "./wiki-hub.js";

/**
 * Markdown-backed AORMS wiki — pages live in `src/content/wiki/*.md` and ship
 * with the frontend build. Canonical URL: aorms.in/wiki.
 */

const files = import.meta.glob("../content/wiki/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export interface WikiPage {
  slug: string;
  title: string;
  excerpt: string;
  order: number;
  section: string;
  /** Central wiki hub — hcw-ui | aorms-studio | ai-core | management */
  domain: WikiHubId;
  updated: string;
  draft: boolean;
  readingMinutes: number;
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

function slugFromPath(path: string): string {
  const base = (path.split("/").pop() ?? "").replace(/\.md$/, "");
  return base === "index" ? "index" : base;
}

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parseDomain(raw: string | undefined): WikiHubId {
  if (raw && isAormsStudioLegacySlug(raw)) return "aorms-studio";
  const valid: WikiHubId[] = ["hcw-ui", "aorms-studio", "ai-core", "management"];
  if (raw && valid.includes(raw as WikiHubId)) return raw as WikiHubId;
  return "aorms-studio";
}

function toPage(path: string, raw: string): WikiPage {
  const { data, body } = parseFrontmatter(raw);
  const slug = data.slug || slugFromPath(path);
  return {
    slug,
    title: data.title || slug,
    excerpt: data.excerpt || "",
    order: Number.parseInt(data.order ?? "99", 10) || 99,
    section: data.section || "Guides",
    domain: parseDomain(data.domain),
    updated: data.updated || "",
    draft: data.draft === "true",
    readingMinutes: readingMinutes(body),
    markdown: body,
  };
}

const ALL: WikiPage[] = Object.entries(files)
  .map(([path, raw]) => toPage(path, raw))
  .filter((p) => (import.meta.env.PROD ? !p.draft : true))
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export function listWikiPages(): WikiPage[] {
  return ALL.filter((p) => p.slug !== "index");
}

export function getWikiHome(): WikiPage | undefined {
  return ALL.find((p) => p.slug === "index");
}

export function getWikiPage(slug: string): WikiPage | undefined {
  if (slug === "index") return getWikiHome();
  const resolved = resolveWikiHubSlug(slug);
  return ALL.find((p) => p.slug === resolved);
}

export function wikiSections(): { section: string; pages: WikiPage[] }[] {
  const pages = listWikiPages();
  const map = new Map<string, WikiPage[]>();
  for (const p of pages) {
    const list = map.get(p.section) ?? [];
    list.push(p);
    map.set(p.section, list);
  }
  return [...map.entries()].map(([section, sectionPages]) => ({
    section,
    pages: sectionPages,
  }));
}

/** Pages grouped under each central wiki hub (overview + guides). */
export function wikiHubSections(): {
  hub: (typeof WIKI_HUBS)[number];
  overview?: WikiPage;
  guides: WikiPage[];
}[] {
  const pages = listWikiPages();
  return WIKI_HUBS.map((hub) => {
    const inHub = pages.filter((p) => p.domain === hub.id);
    const overview = inHub.find((p) => p.slug === hub.hubSlug);
    const guides = inHub
      .filter((p) => p.slug !== hub.hubSlug)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    return { hub, overview, guides };
  });
}
