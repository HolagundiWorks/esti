import { z } from "zod";

/** Searchable object kinds returned by universal search. */
export const SearchEntityType = z.enum([
  "PROJECT",
  "CLIENT",
  "TASK",
  "DRAWING",
  "LETTER",
  "PROPOSAL",
  "CONTRACT",
  "DECISION",
  "CRITICAL_NOTE",
  "LESSON",
  "OFFICE_TEMPLATE",
  "DSR_ITEM",
  "SPEC_CATALOG",
  "SPEC_STANDARD",
  "STRUCTURAL_TEMPLATE",
  "CONSULTANT",
  "CONTRACTOR",
  "TENDER",
  "INVOICE",
  "FEE_PROPOSAL",
  "MOM",
  "INSPECTION",
  "SPEC_SHEET",
]);
export type SearchEntityType = z.infer<typeof SearchEntityType>;

export const SEARCH_ENTITY_LABEL: Record<SearchEntityType, string> = {
  PROJECT: "Project",
  CLIENT: "Client",
  TASK: "Task",
  DRAWING: "Drawing / CAD",
  LETTER: "Letter",
  PROPOSAL: "Proposal",
  CONTRACT: "Contract",
  DECISION: "Decision (CRIF)",
  CRITICAL_NOTE: "Critical note",
  LESSON: "Lesson learned",
  OFFICE_TEMPLATE: "Office template",
  DSR_ITEM: "DSR item",
  SPEC_CATALOG: "Spec catalogue",
  SPEC_STANDARD: "Specification standard",
  STRUCTURAL_TEMPLATE: "Structural template",
  CONSULTANT: "Consultant",
  CONTRACTOR: "Contractor / vendor",
  TENDER: "Tender",
  INVOICE: "Invoice",
  FEE_PROPOSAL: "Fee proposal",
  MOM: "Meeting minutes",
  INSPECTION: "Site report",
  SPEC_SHEET: "Specification sheet",
};

/** Knowledge Bank facet — subset of universal search types. */
export const KB_SEARCH_TYPES: SearchEntityType[] = [
  "OFFICE_TEMPLATE",
  "DSR_ITEM",
  "SPEC_CATALOG",
  "SPEC_STANDARD",
  "STRUCTURAL_TEMPLATE",
  "DRAWING",
  "CONTRACTOR",
  "LESSON",
];

export const LessonCategory = z.enum([
  "DESIGN",
  "PROCUREMENT",
  "SITE",
  "CLIENT",
  "TEAM",
  "OTHER",
]);
export type LessonCategory = z.infer<typeof LessonCategory>;

export const LESSON_CATEGORY_LABEL: Record<LessonCategory, string> = {
  DESIGN: "Design",
  PROCUREMENT: "Procurement",
  SITE: "Site",
  CLIENT: "Client",
  TEAM: "Team",
  OTHER: "Other",
};

export const LessonStatus = z.enum(["DRAFT", "PUBLISHED"]);
export type LessonStatus = z.infer<typeof LessonStatus>;

export const LessonCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  category: LessonCategory.default("OTHER"),
  body: z.string().min(1).max(20000),
  recommendations: z.string().max(10000).default(""),
  tags: z.string().max(500).optional(),
});
export type LessonCreate = z.infer<typeof LessonCreate>;

export const LessonUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  category: LessonCategory.optional(),
  body: z.string().min(1).max(20000).optional(),
  recommendations: z.string().max(10000).optional(),
  tags: z.string().max(500).optional(),
});
export type LessonUpdate = z.infer<typeof LessonUpdate>;

export const SearchQueryInput = z.object({
  q: z.string().trim().min(2).max(200),
  types: z.array(SearchEntityType).max(30).optional(),
  projectId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type SearchQueryInput = z.infer<typeof SearchQueryInput>;

export const SearchHit = z.object({
  entityType: SearchEntityType,
  entityId: z.string().uuid(),
  title: z.string(),
  snippet: z.string(),
  href: z.string(),
  rank: z.number(),
  projectId: z.string().uuid().nullable().optional(),
  projectRef: z.string().nullable().optional(),
});
export type SearchHit = z.infer<typeof SearchHit>;

/** Build SPA deep link for a search hit. */
export function searchResultHref(
  entityType: SearchEntityType,
  entityId: string,
  projectId?: string | null,
): string {
  switch (entityType) {
    case "PROJECT":
      return `/projects/${entityId}`;
    case "CLIENT":
      return "/clients";
    case "TASK":
      return `/tasks?task=${entityId}`;
    case "DRAWING":
      return projectId ? `/projects/${projectId}?tab=drawings` : "/projects";
    case "LETTER":
      return "/office/letters";
    case "PROPOSAL":
      return "/office/proposals";
    case "CONTRACT":
      return "/office/contracts";
    case "DECISION":
    case "CRITICAL_NOTE":
    case "LESSON":
      return projectId ? `/projects/${projectId}?tab=${entityType === "LESSON" ? "lessons" : "overview"}` : "/projects";
    case "OFFICE_TEMPLATE":
      return "/office/documents";
    case "DSR_ITEM":
      return "/knowledge-bank?tab=dsr";
    case "SPEC_CATALOG":
    case "SPEC_STANDARD":
      return "/knowledge-bank?tab=specification";
    case "STRUCTURAL_TEMPLATE":
      return "/knowledge-bank?tab=steelflow";
    case "CONSULTANT":
      return "/consultants";
    case "CONTRACTOR":
      return "/contractors";
    case "TENDER":
      return "/office/tenders";
    case "INVOICE":
      return "/invoices";
    case "FEE_PROPOSAL":
      return "/accounting/fees";
    case "MOM":
    case "INSPECTION":
    case "SPEC_SHEET":
      return projectId ? `/projects/${projectId}?tab=documents` : "/projects";
    default:
      return "/search";
  }
}
