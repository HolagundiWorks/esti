import { LANDING_NAV } from "./landing-slugs.js";

/**
 * Blog → landing internal linking. Blog posts otherwise only link to adjacent
 * posts; the SEO audit flagged that every post should link to a few feature
 * pages. This maps a post's tags to relevant keyword landing pages so every
 * post (existing and future) gets 3-5 contextual internal links automatically.
 */

/** slug → human label, drawn from the curated LANDING_NAV groups. */
const SLUG_LABEL: Record<string, string> = Object.fromEntries(
  LANDING_NAV.flatMap((g) => g.links.map((l) => [l.slug, l.label])),
);

/** Tag → ordered candidate landing slugs (most relevant first). */
const TAG_TO_LANDING: Record<string, string[]> = {
  Finance: [
    "gst-billing-software-architects-india",
    "architect-fee-proposal-software",
    "coa-compliant-billing-software",
    "contractor-billing-software-for-architects",
  ],
  Compliance: [
    "gst-on-architecture-services",
    "hsn-sac-code-for-architects",
    "coa-compliant-billing-software",
  ],
  India: [
    "architecture-software-india",
    "architecture-office-management-india",
    "architecture-erp-india",
    "gst-billing-software-architects-india",
  ],
  Revisions: [
    "architecture-revision-tracking",
    "drawing-revision-tracking-software",
    "client-revision-management",
    "architecture-change-management-software",
  ],
  Approvals: [
    "architecture-approval-workflow-software",
    "architect-document-approval-system",
    "architecture-client-portal-software",
  ],
  Drawings: [
    "drawing-revision-tracking-software",
    "architect-document-approval-system",
    "architecture-approval-workflow-software",
  ],
  Workflow: [
    "architecture-office-workflow-management",
    "architecture-approval-workflow-software",
    "architecture-project-management-software",
  ],
  Operations: [
    "architecture-office-management-software",
    "architecture-practice-management-software",
    "architecture-erp-india",
  ],
  Practice: [
    "architecture-practice-management-software",
    "architecture-firm-management-software",
    "software-for-architecture-firms",
  ],
  Client: [
    "architecture-client-management-software",
    "architecture-client-portal-software",
    "construction-client-management-software",
  ],
  Team: [
    "architecture-firm-management-software",
    "architecture-practice-management-software",
  ],
  Product: [
    "architecture-office-management-software",
    "architecture-estimation-software",
  ],
  AI: ["architecture-office-management-software", "architecture-practice-management-software"],
  Estimation: ["architecture-estimation-software", "architect-fee-proposal-software"],
};

/** Sensible defaults for posts whose tags map to nothing specific. */
const FALLBACK = [
  "architecture-office-management-software",
  "architecture-practice-management-software",
  "architecture-revision-tracking",
];

export interface RelatedLanding {
  slug: string;
  label: string;
}

/** Up to `max` distinct landing links relevant to a post's tags. */
export function relatedLandingForTags(tags: readonly string[], max = 4): RelatedLanding[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (slug: string) => {
    if (!seen.has(slug) && SLUG_LABEL[slug]) {
      seen.add(slug);
      out.push(slug);
    }
  };
  // Round-robin across tags so a two-tag post draws from both, not just the first.
  const lists = tags.map((t) => TAG_TO_LANDING[t] ?? []).filter((l) => l.length > 0);
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length) push(l[i]!);
  }
  for (const slug of FALLBACK) {
    if (out.length >= max) break;
    push(slug);
  }
  return out.slice(0, max).map((slug) => ({ slug, label: SLUG_LABEL[slug]! }));
}
