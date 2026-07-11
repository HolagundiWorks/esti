/**
 * Product naming — keep in sync with docs/esti/AORMS-PLATFORM-NOMENCLATURE.md.
 * Platform: AORMS. Shipped workspace from this repo: AORMS-Studio (slug: aorms-studio).
 */
export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Accelerated Operational Resources Management System",
  /** Platform home hero — no third-party product names. */
  heroHeadline: [
    "From disconnected tools to one operating system:",
    "Bring research, analysis, collaboration, and delivery into a single workflow.",
  ] as const,
  /** Consulting offices that advise clients — not solution delivery or PM vendors. */
  advisoryDomains: [
    "Risk management",
    "Education",
    "Auditing",
    "AEC",
  ] as const,
  fragmentedTools: [
    "Messaging",
    "Team communication",
    "Advisory workflows",
    "Documentation",
    "Email",
    "Sheets",
    "File sharing",
  ] as const,
} as const;

/** The two framework layers every AORMS consulting office deploys. */
export const PLATFORM_FRAMEWORKS = {
  operational: {
    title: "Operational framework",
    summary:
      "How the consulting office runs — intake, process standards, review chains, audit trails, and governed knowledge.",
  },
  design: {
    title: "Design framework",
    summary:
      "How engagements are structured — methodologies, deliverable models, templates, and versioned advisory patterns.",
  },
} as const;

/** Vertical workspace naming — `AORMS-{Name}` per advisory domain. */
export const AORMS_VERTICALS = {
  studio: {
    slug: "aorms-studio",
    legacySlugs: ["hived", "aorms-architecture"] as const,
    title: "AORMS-Studio",
    tagline: "Architecture workspace for Indian studios",
    audience: "Indian architecture and interior design practices",
    appUrl: "https://app.aorms.in",
    wikiName: "AORMS-Studio docs",
    industryId: "aec" as const,
  },
  compliance: {
    slug: "aorms-compliance",
    title: "AORMS-Compliance",
    industryId: "risk" as const,
  },
  advisory: {
    slug: "aorms-advisory",
    title: "AORMS-Advisory",
    industryId: "education" as const,
  },
  audit: {
    slug: "aorms-audit",
    title: "AORMS-Audit",
    industryId: "auditing" as const,
  },
} as const;

/** Shipped AEC workspace — Indian architecture consultancies (this monorepo). */
export const AORMS_STUDIO = AORMS_VERTICALS.studio;

/** @deprecated Use {@link AORMS_STUDIO}. */
export const HIVED = AORMS_STUDIO;

/** @deprecated Use {@link AORMS_STUDIO}. */
export const AORMS_ARCHITECTURE = AORMS_STUDIO;

/** Legacy single slug — prefer {@link AORMS_STUDIO.legacySlugs}. */
export const AORMS_STUDIO_LEGACY_SLUG = AORMS_STUDIO.legacySlugs[1];

export function isAormsStudioLegacySlug(slug: string): boolean {
  return (AORMS_STUDIO.legacySlugs as readonly string[]).includes(slug);
}

/** Industries — consulting offices that advise in each domain (not solution delivery). */
export const PLATFORM_INDUSTRIES = [
  {
    id: "risk",
    status: "roadmap" as const,
    title: "Risk management",
    workspace: AORMS_VERTICALS.compliance.title,
    subtitle: "Advisory consulting offices",
    body:
      "Firms that consult on enterprise risk, compliance, and governance — operational and design frameworks for assessments, review chains, and board-ready reporting without running client operations.",
    bullets: [
      "Risk registers & assessment workflows",
      "Serial review & sign-off chains",
      "EmOI · governed frameworks & citations",
    ],
  },
  {
    id: "education",
    status: "roadmap" as const,
    title: "Education",
    workspace: AORMS_VERTICALS.advisory.title,
    subtitle: "Advisory consulting offices",
    body:
      "Consultancies advising schools, colleges, and training bodies on accreditation, curriculum, and governance — not classroom delivery or student project management.",
    bullets: [
      "Accreditation & audit readiness models",
      "Governed resource libraries",
      "EmOI · semantic search on approved content",
    ],
  },
  {
    id: "auditing",
    status: "roadmap" as const,
    title: "Auditing",
    workspace: AORMS_VERTICALS.audit.title,
    subtitle: "Assurance consulting offices",
    body:
      "Chartered accountants and assurance consultancies — engagement frameworks, working-paper models, review chains, and compliance reporting with immutable audit trails.",
    bullets: [
      "Engagement & working-paper templates",
      "Automated compliance & risk reporting",
      "EmOI · dual-tier operational intelligence",
    ],
  },
  {
    id: "aec",
    status: "live" as const,
    title: "AEC",
    workspace: AORMS_STUDIO.title,
    subtitle: "Architecture, Engineering & Construction advisory",
    body:
      "Architecture and design consultancies advising Indian clients — operational and design frameworks for fees, revisions, compliance, and studio intelligence. Not construction project management.",
    bullets: [
      "COA fee proposals & GST invoicing",
      "Drawing register & transmittals",
      "ESTI · Studio Intelligence · Ask ESTI",
    ],
    workspaceSlug: AORMS_STUDIO.slug,
    cta: `Explore ${AORMS_STUDIO.title}`,
  },
] as const;

/** Human Centric Works — operator / design studio behind AORMS. */
export const HUMAN_CENTRIC_WORKS = {
  legalName: "Human Centric Works",
  shortName: "HCW",
  attribution: "Developed by Human Centric Works",
  location: "Hospet, Karnataka, India",
  email: "hi@aorms.in",
  logoOnDark: "/hcw-white.png",
  logoOnLight: "/hcw-black.png",
} as const;

/** @deprecated Use {@link HUMAN_CENTRIC_WORKS}. */
export const HOLAGUNDI_CONSULTING_WORKS = HUMAN_CENTRIC_WORKS;

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  /** AORMS-Studio only — not the platform-wide intelligence layer. */
  workspace: AORMS_STUDIO.slug,
} as const;

/** Platform intelligence layer — all AORMS verticals except AORMS-Studio ESTI. */
export const EMOI = {
  name: "EmOI",
  expansion: "Embedded Operational Intelligence",
} as const;
