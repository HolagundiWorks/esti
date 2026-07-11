/** In-page section anchors for `/aorms-consultancy` SectionDock. */
import type { SectionNavLink } from "./landing-nav.js";

export const CONSULTANCY_LANDING_SECTIONS = [
  { href: "/aorms-consultancy#frameworks", label: "Frameworks" },
  { href: "/aorms-consultancy#capabilities", label: "Capabilities" },
  { href: "/aorms-consultancy#agents", label: "Agents" },
  { href: "/aorms-consultancy#compare", label: "Compare" },
  { href: "/aorms-consultancy#faq", label: "FAQ" },
] as const satisfies readonly SectionNavLink[];
