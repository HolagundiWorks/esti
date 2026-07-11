/**
 * Central wiki hubs — four documentation domains on aorms.in/wiki.
 * Keep aligned with docs/esti/AORMS-PLATFORM-NOMENCLATURE.md.
 */
import { AORMS_STUDIO, isAormsStudioLegacySlug } from "./product-nomenclature.js";

export type WikiHubId = "hcw-ui" | "aorms-studio" | "ai-core" | "management";

export interface WikiHub {
  id: WikiHubId;
  /** Hub overview page slug (`frontend/src/content/wiki/<slug>.md`). */
  hubSlug: string;
  title: string;
  tagline: string;
  description: string;
  order: number;
}

/** Canonical four-pillar wiki IA. */
export const WIKI_HUBS: readonly WikiHub[] = [
  {
    id: "hcw-ui",
    hubSlug: "hcw-ui-kit",
    title: "HCW-UI",
    tagline: "Human Centric Works design system",
    description:
      "Layered UI kit (@hcw/ui-kit) — flat, soft, and glass surfaces; Rail · Stage · Dock spatial model; Urbanist type and Radiant Orange accent.",
    order: 1,
  },
  {
    id: "aorms-studio",
    hubSlug: AORMS_STUDIO.slug,
    title: AORMS_STUDIO.title,
    tagline: "Architecture advisory workspace",
    description:
      "The shipped workspace for Indian architecture consultancies — projects, fees, revisions, drawings, site supervision, portals, and Studio Intelligence.",
    order: 2,
  },
  {
    id: "ai-core",
    hubSlug: "ai-core",
    title: "AI core",
    tagline: "EmOI + ESTI intelligence",
    description:
      "Platform-wide EmOI (dual-tier AI firewall) and AORMS-Studio ESTI (Ask ESTI, cognition engine, ESTI Pulse) — deterministic truth, LLM explanation.",
    order: 3,
  },
  {
    id: "management",
    hubSlug: "management",
    title: "Management",
    tagline: "Operational & office management",
    description:
      "How the consultancy runs — finance, billing, HR, accounts, licensing, team performance, and the operational framework on one spine.",
    order: 4,
  },
] as const;

const HUB_BY_ID = new Map(WIKI_HUBS.map((h) => [h.id, h]));
const HUB_BY_SLUG = new Map(WIKI_HUBS.map((h) => [h.hubSlug, h]));

export function resolveWikiHubSlug(slug: string): string {
  if (isAormsStudioLegacySlug(slug)) return AORMS_STUDIO.slug;
  return slug;
}

export function getWikiHub(id: WikiHubId): WikiHub | undefined {
  return HUB_BY_ID.get(id);
}

export function wikiHubForSlug(slug: string): WikiHub | undefined {
  return HUB_BY_SLUG.get(resolveWikiHubSlug(slug));
}

export function isWikiHubSlug(slug: string): boolean {
  return HUB_BY_SLUG.has(resolveWikiHubSlug(slug));
}
