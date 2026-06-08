import { z } from "zod";
import { ProjectWorkType } from "./schemas.js";

// --- Proposal / agreement ---------------------------------------------------

export const ProposalCreate = z.object({
  projectId: z.string().uuid(),
  workType: ProjectWorkType.default("ARCHITECTURE"),
  scope: z.string().max(8000).optional(),
  feePaise: z.number().int().nonnegative().default(0),
  notes: z.string().max(2000).optional(),
});
export type ProposalCreate = z.infer<typeof ProposalCreate>;

/**
 * Default COA Conditions-of-Engagement scope text per discipline. Seeds the
 * proposal's scope field; the architect edits before issuing.
 */
export const COA_SCOPE_TEMPLATE: Record<z.infer<typeof ProjectWorkType>, string> = {
  ARCHITECTURE:
    "Architectural services as per the Council of Architecture (COA) Conditions of " +
    "Engagement:\n1. Taking the Client's instructions and preparation of the brief.\n" +
    "2. Concept design and preliminary drawings.\n3. Preliminary estimate of cost.\n" +
    "4. Drawings for statutory approvals and assistance in obtaining sanction.\n" +
    "5. Working drawings, schedules and tender documents.\n" +
    "6. Inviting/analysing tenders and assistance in award of work.\n" +
    "7. Periodic site inspection and construction administration.\n" +
    "8. Issue of completion certificate.",
  INTERIOR:
    "Interior design consultancy:\n1. Site study, measurement and brief.\n" +
    "2. Concept, mood boards and space planning.\n3. Design development, materials and finishes.\n" +
    "4. Working drawings, detailing and BOQ.\n5. Vendor coordination and procurement support.\n" +
    "6. Periodic site supervision and snagging.",
  LANDSCAPE:
    "Landscape consultancy:\n1. Site appraisal and survey study.\n2. Concept landscape master plan.\n" +
    "3. Planting, hardscape and services design.\n4. Working drawings and BOQ.\n" +
    "5. Site supervision during execution.",
  MISC: "Scope of work as mutually agreed between the Client and the Architect.",
};

// --- Site inspection report -------------------------------------------------

export const InspectionCreate = z.object({
  projectId: z.string().uuid(),
  dateVisit: z.string().date().optional(),
  weather: z.string().max(80).optional(),
  attendees: z.string().max(1000).optional(),
  progress: z.string().max(4000).optional(),
  observations: z.string().max(8000).optional(),
  instructions: z.string().max(8000).optional(),
  nextVisit: z.string().date().optional(),
  inspectorName: z.string().max(200).optional(),
});
export type InspectionCreate = z.infer<typeof InspectionCreate>;

// --- Specification sheet ----------------------------------------------------

export const SpecItemInput = z.object({
  category: z.string().max(120).optional(),
  item: z.string().min(1).max(200),
  make: z.string().max(120).optional(),
  specification: z.string().max(500).optional(),
  finish: z.string().max(120).optional(),
  remarks: z.string().max(300).optional(),
});
export type SpecItemInput = z.infer<typeof SpecItemInput>;

export const SpecSheetCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  items: z.array(SpecItemInput).min(1, "Add at least one specification row"),
});
export type SpecSheetCreate = z.infer<typeof SpecSheetCreate>;

// --- Mood board -------------------------------------------------------------

export const MoodBoardCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
});
export type MoodBoardCreate = z.infer<typeof MoodBoardCreate>;

/** Mood-board image upload limits (mirrors the firm-logo image rules). */
export const MOOD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const MOOD_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
