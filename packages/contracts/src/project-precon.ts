/**
 * AORMS-Studio pre-construction R&O — project risk, opportunity, phase gates.
 * Reuses shared enums/helpers from consultancy (same framework).
 * docs/esti/AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md
 */
import { z } from "zod";
import {
  ConsPhaseGateDecision,
  ConsPhaseGateKey,
  OpportunityArea,
  OpportunityResponse,
  OpportunitySource,
  OpportunityStatus,
  RiskResponse,
  RiskStatus,
  canDecidePhaseGate,
} from "./consultancy.js";

const score = z.number().int().min(1).max(5);

export const ProjectRiskCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  likelihood: score.default(3),
  impact: score.default(3),
  owner: z.string().trim().max(200).optional(),
  response: RiskResponse.default("REDUCE"),
  mitigation: z.string().trim().max(2000).optional(),
  residualLikelihood: score.optional(),
  residualImpact: score.optional(),
});
export type ProjectRiskCreate = z.infer<typeof ProjectRiskCreate>;

export const ProjectRiskUpdate = ProjectRiskCreate.omit({ projectId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: RiskStatus.optional(),
  });
export type ProjectRiskUpdate = z.infer<typeof ProjectRiskUpdate>;

export const ProjectOpportunityCreate = z.object({
  projectId: z.string().uuid(),
  linkedRiskId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  source: OpportunitySource.default("WORKSHOP"),
  area: OpportunityArea.default("DESIGN"),
  probability: score.default(3),
  impact: score.default(3),
  response: OpportunityResponse.default("ENHANCE"),
  owner: z.string().trim().max(200).optional(),
  actionPlan: z.string().trim().max(4000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  valueNote: z.string().trim().max(2000).optional(),
  estimatedValuePaise: z.number().int().nonnegative().optional(),
});
export type ProjectOpportunityCreate = z.infer<typeof ProjectOpportunityCreate>;

export const ProjectOpportunityUpdate = ProjectOpportunityCreate.omit({ projectId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: OpportunityStatus.optional(),
  });
export type ProjectOpportunityUpdate = z.infer<typeof ProjectOpportunityUpdate>;

export const ProjectPhaseGateUpsert = z.object({
  projectId: z.string().uuid(),
  gateKey: ConsPhaseGateKey,
  phaseId: z.string().uuid().optional(),
  checklist: z.record(z.string(), z.boolean()).default({}),
  decision: ConsPhaseGateDecision.default("PENDING"),
  notes: z.string().trim().max(4000).optional(),
});
export type ProjectPhaseGateUpsert = z.infer<typeof ProjectPhaseGateUpsert>;

export { canDecidePhaseGate };
