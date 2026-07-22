/**
 * Product naming — keep in sync with docs/esti/AORMS-PLATFORM-NOMENCLATURE.md.
 * Platform: AORMS (AEC consulting firms only). Apps: AORMS-Studio + AORMS-Consultancy.
 */
import { platformPageUrl } from "./aorms-surface-urls.js";
export const AORMS_PLATFORM = {
  name: "AORMS",
  expansion: "Accelerated Operational Resources Management System",
  /** Platform scope — AEC consulting only (2026-07). */
  tagline: "The operating system for AEC consulting firms",
  audience:
    "AEC consulting firms — architecture and engineering practices that advise clients, not solution delivery or construction PM",
  /** Platform home hero — no third-party product names. */
  heroHeadline: [
    "From disconnected tools to one operating system:",
    "Built for architecture and engineering consultancies.",
  ] as const,
  aecDisciplines: ["Architecture", "Engineering"] as const,
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

/** The two AORMS apps — `AORMS-{Name}` for architecture and engineering consultancies. */
export const AORMS_APPS = {
  studio: {
    slug: "aorms-studio",
    legacySlugs: ["hived", "aorms-architecture"] as const,
    title: "AORMS-Studio",
    discipline: "Architecture",
    tagline: "Architecture consultancy workspace for Indian practices",
    audience: "Indian architecture and interior design consultancies",
    appUrl: "https://studio.aorms.in",
    /** @deprecated Use studio.aorms.in — app.aorms.in redirects at nginx. */
    legacyAppUrl: "https://app.aorms.in",
    marketingPath: "/login",
    /** Unified landing section on `aorms.in`. */
    landingHref: "/#studio",
    wikiPath: "/wiki/aorms-studio",
    wikiName: "AORMS-Studio docs",
    status: "live" as const,
  },
  consultancy: {
    slug: "aorms-consultancy",
    title: "AORMS-Consultancy",
    discipline: "Engineering",
    tagline: "Engineering consultancy workspace",
    audience:
      "Structural, MEP, civil, and multidisciplinary engineering consultancies advising on built-environment projects",
    appUrl: "https://consultancy.aorms.in",
    marketingPath: "/aorms-consultancy",
    /** Unified landing section on `aorms.in`. */
    landingHref: "/#consultancy",
    wikiPath: "/wiki/aorms-consultancy",
    /** Built in monorepo; public launch gated on P9.V / P9.M. */
    status: "launch_gated" as const,
  },
} as const;

/** Shipped architecture app — this monorepo (Indian architecture consultancies). */
export const AORMS_STUDIO = AORMS_APPS.studio;

/** Engineering consultancy app — code-complete; launch gated. */
export const AORMS_CONSULTANCY = AORMS_APPS.consultancy;

/** Legacy single slug — prefer {@link AORMS_STUDIO.legacySlugs}. */
export const AORMS_STUDIO_LEGACY_SLUG = AORMS_STUDIO.legacySlugs[1];

export function isAormsStudioLegacySlug(slug: string): boolean {
  return (AORMS_STUDIO.legacySlugs as readonly string[]).includes(slug);
}

/** Platform landing — the two AEC apps on one spine. */
export const PLATFORM_APPS = [
  {
    id: "architecture",
    status: AORMS_STUDIO.status,
    title: AORMS_STUDIO.discipline,
    workspace: AORMS_STUDIO.title,
    subtitle: "Architecture consultancies",
    body:
      "Indian architecture and design consultancies — operational and design frameworks for fees, revisions, statutory compliance, drawings, and studio intelligence. Not construction project management.",
    bullets: [
      "COA fee proposals & GST invoicing",
      "Drawing register & transmittals",
      "ESTI · internal AI agent · Ask ESTI",
    ],
    workspaceSlug: AORMS_STUDIO.slug,
    href: AORMS_STUDIO.landingHref,
    cta: `Explore ${AORMS_STUDIO.title}`,
  },
  {
    id: "engineering",
    status: AORMS_CONSULTANCY.status,
    title: AORMS_CONSULTANCY.discipline,
    workspace: AORMS_CONSULTANCY.title,
    subtitle: "Engineering consultancies",
    body:
      "Structural, MEP, civil, and multidisciplinary engineering consultancies — engagement frameworks, review chains, deliverable models, and governed knowledge for advisory work on built-environment projects.",
    bullets: [
      "Engagement & deliverable frameworks",
      "Serial review & sign-off chains",
      "EOMS · knowledge bank · codes & compliance on tap",
    ],
    workspaceSlug: AORMS_CONSULTANCY.slug,
    href: AORMS_CONSULTANCY.landingHref,
    cta: `Learn about ${AORMS_CONSULTANCY.title}`,
  },
] as const;

/**
 * Portal and surface labels — staff workspace, external portals, account hub.
 * Staff workspace is **AORMS-Studio** (never "AORMS portal"). External portals
 * keep the word *portal*; they are scoped to AORMS-Studio today.
 */
export const AORMS_PORTALS = {
  studio: {
    title: AORMS_STUDIO.title,
    navLabel: AORMS_STUDIO.title,
    signInTitle: `${AORMS_STUDIO.title} sign-in`,
    signInLink: `Sign in to ${AORMS_STUDIO.title}`,
    sessionLabel: `${AORMS_STUDIO.title} session`,
    railFallback: AORMS_STUDIO.title,
    url: AORMS_STUDIO.appUrl,
  },
  client: { label: "Client portal" as const },
  consultant: {
    label: "Consultant portal" as const,
    alias: "Collaborator portal" as const,
  },
  contractor: { label: "Contractor portal" as const },
  site: { label: "Site portal" as const },
  external: {
    authTagline: `Client, consultant, contractor & site portals · ${AORMS_STUDIO.title}`,
    signInIntro:
      "Sign in to your client, consultant, contractor, or site portal.",
    staffHint: `Office team members use ${AORMS_STUDIO.title} sign-in`,
    loginPageLink: "Client, consultant, contractor & site portals",
    marketingList: "Client, consultant, contractor, and site portals",
    stageHeadline: "External portal access",
    url: platformPageUrl("externalAccess"),
  },
  account: {
    name: "AORMS account",
    hubCaption: "Account & licensing",
    personal: "Personal account",
    company: "Company account",
    licensing: "Licensing console",
    manageLicence: "Manage your AORMS account & licence",
    create: "Create AORMS account",
    myAccount: "My AORMS account",
    stageHeadline: "AORMS account",
    stageSubline: "Identity, companies, and licence — managed in one place.",
    url: platformPageUrl("account"),
  },
  auth: {
    licensingHeadline: "Licensing console",
    licensingSubline: "Platform administration for Human Centric Works.",
  },
} as const;

/** External portal labels — lists, SEO, marketing tiles. */
export const EXTERNAL_PORTAL_LABELS = [
  AORMS_PORTALS.client.label,
  AORMS_PORTALS.consultant.label,
  AORMS_PORTALS.contractor.label,
  AORMS_PORTALS.site.label,
] as const;

/** Comma-separated external portal list for prose. */
export function externalPortalsPhrase(finalConjunction: "and" | "or" = "and"): string {
  const items = [...EXTERNAL_PORTAL_LABELS];
  if (items.length <= 1) return items[0] ?? "";
  const last = items.pop()!;
  return `${items.join(", ")}, ${finalConjunction} ${last.toLowerCase()}`;
}

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

export const ESTI = {
  name: "ESTI",
  expansion: "Embedded Studio Intelligence",
  /** Internal AI agent — firm-bound RAG, cognition, and workspace intelligence. */
  role: "Internal AI agent",
  summary:
    "Internal AI agent — answers only from validated firm repositories; cognition engine, Ask ESTI, Studio Intelligence, and ESTI Pulse.",
  workspace: AORMS_STUDIO.slug,
} as const;

/** Knowledge Bank portal — EOMS textbook intake → validated firm library → ESTI RAG. */
export const KNOWLEDGE_BANK_PORTAL = {
  title: "Knowledge Bank portal",
  route: "/libraries/knowledge-bank-portal",
  url: platformPageUrl("knowledgeBank"),
  summary:
    "Governed reference library: HCW Markdown Tool converts PDFs to markdown; EOMS rephrases and summarises; published sections are available to ESTI (Ask ESTI).",
} as const;

/** @deprecated Use KNOWLEDGE_BANK_PORTAL — kept for transitional imports. */
export const REPO_PORTAL = KNOWLEDGE_BANK_PORTAL;

/**
 * EOMS — the continuously-learning knowledge bank. A standalone API in its own
 * repository (not the `esti` monorepo) that catalogs standard codebooks and
 * building/compliance codes; AORMS apps and the native tools query it to
 * retrieve authoritative code and data.
 */
export const EOMS = {
  name: "EOMS",
  expansion: "Emergent Object Management System",
  role: "Knowledge bank (standalone API)",
  /** Lives in a separate repository, consumed over its API. */
  external: true,
  hosts: ["Standard codebooks", "Building compliance", "Other compliance codes"] as const,
  summary:
    "The continuously-learning knowledge bank — a standalone API that ingests, catalogs, and serves standard codebooks and building/compliance codes so a specific code or dataset can be retrieved on demand. AORMS apps and the native tools query EOMS; ESTI answers only from the firm's own validated repositories.",
} as const;
