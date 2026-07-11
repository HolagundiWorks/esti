/** Wiki path helpers — canonical host: wiki.aorms.in (see aorms-surface-urls.ts). */

import { AORMS_SURFACES, isWikiHost, surfaceAbsoluteUrl } from "./aorms-surface-urls.js";

export const WIKI_PATH = AORMS_SURFACES.wiki.apexPath;

export { isWikiHost };

/** In-app path for wiki routes (React Router + rail links). */
export function wikiAppPath(slug?: string): string {
  if (typeof window !== "undefined" && isWikiHost()) {
    if (!slug || slug === "index") return "/";
    return `/${slug}`;
  }
  if (!slug || slug === "index") return WIKI_PATH;
  return `${WIKI_PATH}/${slug}`;
}

/** Absolute canonical wiki URL (SEO, share links, prerender). */
export function wikiPageUrl(slug?: string): string {
  if (!slug || slug === "index") return AORMS_SURFACES.wiki.host;
  return surfaceAbsoluteUrl("wiki", `/${slug}`);
}

/** Strip legacy /wiki prefix when serving docs on wiki.* host. */
export function wikiSubdomainRedirectTarget(
  pathname: string,
  search = "",
  hash = "",
): string {
  if (pathname === "/" || pathname === "") return `/${search}${hash}`;
  if (pathname.startsWith(WIKI_PATH)) {
    const rest = pathname.slice(WIKI_PATH.length) || "/";
    return `${rest}${search}${hash}`;
  }
  return `${pathname}${search}${hash}`;
}
