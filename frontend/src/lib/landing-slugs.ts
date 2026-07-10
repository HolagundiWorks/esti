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
  "architecture-client-portal-software",
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
  // Phase 12 — client revision + construction client management.
  "client-revision-management",
  "construction-client-management-software",
  // Phase 13 — crawler-readable acquisition pages.
  "client-revision-management-for-architects",
  "architecture-erp-india",
  "architect-fee-proposal-software",
  "architect-document-approval-system",
  "contractor-billing-software-for-architects",
  // Phase 15 — site delivery, coordination, time & meetings (SEO wave 1).
  "architecture-site-visit-software",
  "rfi-management-software-for-architects",
  "architecture-timesheet-software",
  "minutes-of-meeting-software-for-architects",
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
    heading: "Fee recovery",
    links: [
      { slug: "architect-fee-proposal-software", label: "Fee proposal & recovery" },
      { slug: "coa-compliant-billing-software", label: "COA-compliant billing" },
      { slug: "gst-billing-software-architects-india", label: "GST billing for architects" },
      { slug: "gst-on-architecture-services", label: "GST on architecture work" },
      { slug: "hsn-sac-code-for-architects", label: "HSN / SAC code for architects" },
      { slug: "architecture-firm-management-software", label: "Firm management & cash flow" },
    ],
  },
  {
    heading: "Client revisions",
    links: [
      { slug: "minutes-of-meeting-software-for-architects", label: "Minutes of meeting" },
      { slug: "client-revision-management", label: "Client revision management" },
      { slug: "client-revision-management-for-architects", label: "Revision management for architects" },
      { slug: "architecture-revision-tracking", label: "Revision tracking" },
      { slug: "architecture-change-management-software", label: "Change management" },
      { slug: "architecture-approval-workflow-software", label: "Approval workflows" },
      { slug: "architecture-client-portal-software", label: "Client portal" },
    ],
  },
  {
    heading: "Practice systems",
    links: [
      { slug: "architecture-office-management-software", label: "Office management software" },
      { slug: "architecture-practice-management-software", label: "Practice management software" },
      { slug: "architecture-project-management-software", label: "Project management software" },
      { slug: "software-for-architecture-firms", label: "Software for architecture firms" },
      { slug: "architecture-consultancy-management-software", label: "Consultancy management software" },
      { slug: "architecture-erp-india", label: "Architecture ERP India" },
      { slug: "architecture-software-india", label: "Architecture software India" },
      { slug: "architecture-office-management-india", label: "Office management in India" },
      { slug: "architecture-client-management-software", label: "Client management" },
      { slug: "architecture-office-workflow-management", label: "Workflow management" },
      { slug: "architect-document-approval-system", label: "Document approval system" },
      { slug: "drawing-revision-tracking-software", label: "Drawing revision control" },
      { slug: "architecture-site-visit-software", label: "Site visit management" },
      { slug: "rfi-management-software-for-architects", label: "RFI management" },
      { slug: "architecture-timesheet-software", label: "Timesheet & time tracking" },
      { slug: "construction-client-management-software", label: "Construction client management" },
      { slug: "contractor-billing-software-for-architects", label: "Contractor billing" },
    ],
  },
];
