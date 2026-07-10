/** Canonical wiki paths — documentation lives at aorms.in/wiki (not a subdomain). */

export const WIKI_PATH = "/wiki";

const WIKI_HOST_RE = /^wiki\./;
const SITE_ORIGIN = "https://aorms.in";

export function isWikiHost(hostname = window.location.hostname): boolean {
  return WIKI_HOST_RE.test(hostname);
}

/** In-app path for wiki routes (React Router + rail links). */
export function wikiAppPath(slug?: string): string {
  if (!slug || slug === "index") return WIKI_PATH;
  return `${WIKI_PATH}/${slug}`;
}

/** Absolute canonical wiki URL (SEO, share links, prerender). */
export function wikiPageUrl(slug?: string): string {
  const origin =
    typeof window !== "undefined" && !isWikiHost() ? window.location.origin : SITE_ORIGIN;
  if (!slug || slug === "index") return `${origin}${WIKI_PATH}`;
  return `${origin}${WIKI_PATH}/${slug}`;
}

/** Redirect wiki.* host paths to /wiki on the primary domain. */
export function wikiSubdomainRedirectTarget(
  pathname: string,
  search = "",
  hash = "",
): string {
  if (pathname === "/" || pathname === "") return `${WIKI_PATH}${search}${hash}`;
  if (pathname.startsWith("/wiki")) return `${pathname}${search}${hash}`;
  return `${WIKI_PATH}${pathname}${search}${hash}`;
}

/** Rail nav for wiki surfaces (home + top guides + product). */
export const WIKI_SHELL_NAV = [
  { href: "/wiki", label: "Wiki home" },
  { href: "/wiki/getting-started", label: "Getting started" },
  { href: "/wiki/how-to-use-aorms", label: "How to use AORMS" },
  { href: "/wiki/finance-and-billing", label: "Finance & billing" },
  { href: "/wiki/account-and-licence", label: "Account & licence" },
  { href: "/", label: "AORMS home" },
  { href: "/design-system", label: "Design system" },
] as const;
