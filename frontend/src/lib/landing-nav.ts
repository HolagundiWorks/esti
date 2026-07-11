/** In-page section anchors for SectionDock — hash links on the current route only. */

export type SectionNavLink = { href: string; label: string };

export const PLATFORM_LANDING_SECTIONS = [
  { href: "/#platform", label: "Platform" },
  { href: "/#frameworks", label: "Frameworks" },
  { href: "/#ai-firewall", label: "EmOI" },
  { href: "/#modules", label: "Modules" },
  { href: "/#industries", label: "Industries" },
  { href: "/#faq", label: "FAQ" },
] as const;

/** @deprecated Use {@link PLATFORM_LANDING_SECTIONS} — page links belong in the rail only. */
export const PLATFORM_LANDING_NAV = PLATFORM_LANDING_SECTIONS;

/** In-page anchors on `/login` (architecture marketing scroll). */
export const ARCHITECTURE_LANDING_SECTIONS = [
  { href: "/login#fee-recovery", label: "Fee recovery" },
  { href: "/login#revisions", label: "Revisions" },
  { href: "/login#capabilities", label: "Capabilities" },
  { href: "/login#pricing", label: "Pricing" },
  { href: "/login#faq", label: "FAQ" },
] as const;

/** @deprecated Use {@link ARCHITECTURE_LANDING_SECTIONS}. */
export const ARCHITECTURE_LANDING_NAV = ARCHITECTURE_LANDING_SECTIONS;

/** True when a link is an in-page section anchor for `pathname` (not a cross-page route). */
export function isSectionDockLink(href: string, pathname: string): boolean {
  const url = new URL(href, "https://aorms.local");
  const hash = url.hash;
  if (!hash || hash === "#" || hash === "#top") return false;
  const path = url.pathname || "/";
  return path === pathname;
}

export function filterSectionDockLinks<T extends SectionNavLink>(
  links: readonly T[],
  pathname: string,
): T[] {
  return links.filter((l) => isSectionDockLink(l.href, pathname));
}
