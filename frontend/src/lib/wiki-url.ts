/** Wiki path helpers — canonical URLs on aorms.in/wiki (see aorms-surface-urls.ts). */

import { AORMS_PLATFORM_PAGES, platformPageUrl } from "./aorms-surface-urls.js";

export const WIKI_PATH = AORMS_PLATFORM_PAGES.wiki.path;

/** In-app path for wiki routes (React Router + rail links). */
export function wikiAppPath(slug?: string): string {
  if (!slug || slug === "index") return WIKI_PATH;
  return `${WIKI_PATH}/${slug}`;
}

/** Absolute canonical wiki URL (SEO, share links, prerender). */
export function wikiPageUrl(slug?: string): string {
  if (!slug || slug === "index") return platformPageUrl("wiki");
  return platformPageUrl("wiki", slug);
}

/** True when pathname is a wiki route on the platform SPA. */
export function isWikiPath(pathname?: string): boolean {
  const p =
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  return p === WIKI_PATH || p.startsWith(`${WIKI_PATH}/`);
}

/** @deprecated Use isWikiPath — kept for transitional imports. */
export function isWikiHost(pathname?: string): boolean {
  return isWikiPath(pathname);
}
