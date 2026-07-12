import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * AORMS-Consultancy — Phase 0 "Living record" contracts (engagements + the
 * deliverable register). Grounded in docs/esti/AORMS-CONSULTANCY-CASE-STUDY.md;
 * system shape in docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 *
 * Naming note: `engagements` / `esti_engagement` belong to AORMS-Studio's
 * architect↔consultant collaboration model — the engineering-consultancy spine
 * uses the `consultancy.*` tRPC namespace and `esti_cons_*` tables.
 */

/** How the engineering engagement is shaped (case study §4 / frameworks §4.2). */
export const EngagementModel = z.enum([
  "DESIGN_ASSIST",
  "PEER_REVIEW",
  "FULL_DESIGN",
  "SITE_SUPPORT",
]);
export type EngagementModel = z.infer<typeof EngagementModel>;

export const ENGAGEMENT_MODEL_LABEL: Record<EngagementModel, string> = {
  DESIGN_ASSIST: "Design assist",
  PEER_REVIEW: "Peer review",
  FULL_DESIGN: "Full design",
  SITE_SUPPORT: "Site support",
};

/** Engineering disciplines an engagement covers (case study §1). */
export const EngineeringDiscipline = z.enum([
  "STRUCTURAL",
  "MEP",
  "CIVIL",
  "GEOTECHNICAL",
  "FACADE",
  "OTHER",
]);
export type EngineeringDiscipline = z.infer<typeof EngineeringDiscipline>;

export const ENGINEERING_DISCIPLINE_LABEL: Record<EngineeringDiscipline, string> = {
  STRUCTURAL: "Structural",
  MEP: "MEP / building services",
  CIVIL: "Civil / infrastructure",
  GEOTECHNICAL: "Geotechnical",
  FACADE: "Façade / specialist",
  OTHER: "Other",
};

/** `EngagementStatus` is taken by the Studio consultant model — hence Cons*. */
export const ConsEngagementStatus = z.enum(["ACTIVE", "ON_HOLD", "CLOSED"]);
export type ConsEngagementStatus = z.infer<typeof ConsEngagementStatus>;

/** Purpose of issue on a deliverable (ISO 19650 plain-language classes; case study §3.4). */
export const IssueClass = z.enum([
  "FOR_INFORMATION",
  "FOR_APPROVAL",
  "FOR_CONSTRUCTION",
]);
export type IssueClass = z.infer<typeof IssueClass>;

export const ISSUE_CLASS_LABEL: Record<IssueClass, string> = {
  FOR_INFORMATION: "For information",
  FOR_APPROVAL: "For approval",
  FOR_CONSTRUCTION: "For construction",
};

/**
 * Required design-check rigour (BS 5975 / IStructE categories; case study §3.2).
 * Phase 0 records the requirement; Phase 1's sign-off chain enforces it.
 */
export const CheckCategory = z.enum(["CAT0", "CAT1", "CAT2", "CAT3"]);
export type CheckCategory = z.infer<typeof CheckCategory>;

export const CHECK_CATEGORY_LABEL: Record<CheckCategory, string> = {
  CAT0: "Cat 0 — standard solution",
  CAT1: "Cat 1 — same-team peer check",
  CAT2: "Cat 2 — independent check",
  CAT3: "Cat 3 — third-party proof check",
};

/**
 * Phase 0 register lifecycle. The originate→check→approve chain states arrive
 * with Phase 1 (reliance engine) — until then ISSUED is a recorded fact, not a
 * gated act.
 */
export const DeliverableStatus = z.enum(["DRAFT", "ISSUED", "SUPERSEDED", "WITHDRAWN"]);
export type DeliverableStatus = z.infer<typeof DeliverableStatus>;

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SUPERSEDED: "Superseded",
  WITHDRAWN: "Withdrawn",
};

/** Status-dot colour maps (StatusTag convention — colours live in contracts). */
export const CONS_ENGAGEMENT_STATUS_TAG: Record<ConsEngagementStatus, TagColor> = {
  ACTIVE: "green",
  ON_HOLD: "warm-gray",
  CLOSED: "gray",
};

export const CONS_DELIVERABLE_STATUS_TAG: Record<DeliverableStatus, TagColor> = {
  DRAFT: "gray",
  ISSUED: "green",
  SUPERSEDED: "warm-gray",
  WITHDRAWN: "red",
};

export const ConsEngagementCreate = z.object({
  title: z.string().min(1).max(300),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  model: EngagementModel,
  leadDiscipline: EngineeringDiscipline,
  disciplines: z.array(EngineeringDiscipline).max(12).optional(),
  /** What downstream parties may rely on — explicit, per the case study §6.4. */
  relianceScope: z.string().max(4000).optional(),
  /** Current work stage — free text in Phase 0 (COA/RIBA vocab differs per firm). */
  stage: z.string().max(120).optional(),
  notes: z.string().max(8000).optional(),
});
export type ConsEngagementCreate = z.infer<typeof ConsEngagementCreate>;

export const ConsEngagementUpdate = ConsEngagementCreate.partial().extend({
  id: z.string().uuid(),
  status: ConsEngagementStatus.optional(),
});
export type ConsEngagementUpdate = z.infer<typeof ConsEngagementUpdate>;

export const ConsDeliverableCreate = z.object({
  engagementId: z.string().uuid(),
  /** Document number on the register, e.g. STR-CAL-001. */
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  discipline: EngineeringDiscipline,
  revision: z.string().min(1).max(12).default("A"),
  issueClass: IssueClass.default("FOR_INFORMATION"),
  checkCategory: CheckCategory.default("CAT1"),
  notes: z.string().max(8000).optional(),
});
export type ConsDeliverableCreate = z.infer<typeof ConsDeliverableCreate>;

export const ConsDeliverableUpdate = ConsDeliverableCreate.omit({ engagementId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: DeliverableStatus.optional(),
  });
export type ConsDeliverableUpdate = z.infer<typeof ConsDeliverableUpdate>;
