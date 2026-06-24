/**
 * Canonical list of keyword landing-page slugs. Kept as a tiny static module
 * (no markdown imports) so App.tsx can gate the public router without pulling the
 * full markdown bundle into the main chunk — the content itself loads lazily via
 * landing-pages.ts inside the SeoLanding route chunk.
 *
 * Every slug here MUST have a matching `src/content/landing/<slug>.md`, and every
 * such file's slug MUST appear here. The build verifies this in prerender-blog.mjs.
 */
export const LANDING_SLUGS = [
  // Phase 3 — primary product-category keywords.
  "architecture-office-management-software",
  "architecture-firm-management-software",
  "architecture-practice-management-software",
  "architecture-project-management-software",
  "software-for-architecture-firms",
  "architecture-client-management-software",
  "architecture-office-workflow-management",
  // Phase 10 — revision/approval moat keywords.
  "architecture-revision-tracking",
  "drawing-revision-tracking-software",
  "architecture-approval-workflow-software",
  "architecture-change-management-software",
  // Phase 9 — India-specific advantage.
  "architecture-software-india",
  "coa-compliant-billing-software",
  "gst-billing-software-architects-india",
  "architecture-office-management-india",
  // Phase 11 — India tax intent + consultancy.
  "gst-on-architecture-services",
  "hsn-sac-code-for-architects",
  "architecture-consultancy-management-software",
] as const;

const SET: ReadonlySet<string> = new Set(LANDING_SLUGS);

export function isLandingSlug(pathname: string): boolean {
  return SET.has(pathname.replace(/^\/+/, "").replace(/\/+$/, ""));
}

/**
 * Curated link labels for the homepage "Solutions" internal-linking section.
 * Static (no markdown import) so the landing chunk stays lean; labels are short
 * link text, not the full page <h1>.
 */
export interface LandingNavGroup {
  heading: string;
  links: { slug: string; label: string }[];
}

export const LANDING_NAV: LandingNavGroup[] = [
  {
    heading: "By practice",
    links: [
      { slug: "architecture-office-management-software", label: "Office management software" },
      { slug: "architecture-firm-management-software", label: "Firm management software" },
      { slug: "architecture-practice-management-software", label: "Practice management software" },
      { slug: "architecture-project-management-software", label: "Project management software" },
      { slug: "software-for-architecture-firms", label: "Software for architecture firms" },
      { slug: "architecture-consultancy-management-software", label: "Consultancy management software" },
    ],
  },
  {
    heading: "Revisions & approvals",
    links: [
      { slug: "architecture-revision-tracking", label: "Revision tracking" },
      { slug: "drawing-revision-tracking-software", label: "Drawing revision control" },
      { slug: "architecture-approval-workflow-software", label: "Approval workflows" },
      { slug: "architecture-change-management-software", label: "Change management" },
      { slug: "architecture-client-management-software", label: "Client management" },
      { slug: "architecture-office-workflow-management", label: "Workflow management" },
    ],
  },
  {
    heading: "Built for India",
    links: [
      { slug: "architecture-software-india", label: "Architecture software India" },
      { slug: "coa-compliant-billing-software", label: "COA-compliant billing" },
      { slug: "gst-billing-software-architects-india", label: "GST billing for architects" },
      { slug: "architecture-office-management-india", label: "Office management in India" },
      { slug: "gst-on-architecture-services", label: "GST on architecture work" },
      { slug: "hsn-sac-code-for-architects", label: "HSN / SAC code for architects" },
    ],
  },
];
