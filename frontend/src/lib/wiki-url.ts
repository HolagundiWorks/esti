/** Canonical wiki host and path helpers — wiki lives at wiki.aorms.in. */

export const WIKI_SITE = "https://wiki.aorms.in";

const WIKI_HOST_RE = /^wiki\./;

export function isWikiHost(hostname = window.location.hostname): boolean {
  return WIKI_HOST_RE.test(hostname);
}

/** Absolute wiki page URL on the canonical wiki host. */
export function wikiPageUrl(slug?: string): string {
  if (!slug || slug === "index") return `${WIKI_SITE}/`;
  return `${WIKI_SITE}/${slug}`;
}

/** In-app path for wiki routes (main site uses /wiki prefix; wiki host uses /). */
export function wikiAppPath(slug?: string): string {
  const onWiki = isWikiHost();
  if (!slug || slug === "index") return onWiki ? "/" : "/wiki";
  return onWiki ? `/${slug}` : `/wiki/${slug}`;
}
