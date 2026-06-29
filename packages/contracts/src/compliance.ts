import { z } from "zod";

// Studio › Libraries › Compliance Library — structured per-area inputs.

const optStr = z.string().max(2000).optional();

export const ComplianceArea = z.enum(["FAR", "SETBACK", "NBC", "FIRE", "REGULATION"]);
export type ComplianceArea = z.infer<typeof ComplianceArea>;

export const FarRuleCreate = z.object({
  zone: z.string().min(1).max(120),
  plotType: z.string().max(120).optional(),
  plotAreaMinSqm: z.number().nonnegative().optional(),
  plotAreaMaxSqm: z.number().nonnegative().optional(),
  far: z.number().nonnegative().default(0),
  groundCoveragePct: z.number().int().min(0).max(100).optional(),
  maxHeightM: z.number().nonnegative().optional(),
  notes: optStr,
});
export type FarRuleCreate = z.infer<typeof FarRuleCreate>;

export const SetbackRuleCreate = z.object({
  zone: z.string().min(1).max(120),
  plotType: z.string().max(120).optional(),
  frontageMinM: z.number().nonnegative().optional(),
  frontageMaxM: z.number().nonnegative().optional(),
  frontM: z.number().nonnegative().optional(),
  rearM: z.number().nonnegative().optional(),
  side1M: z.number().nonnegative().optional(),
  side2M: z.number().nonnegative().optional(),
  notes: optStr,
});
export type SetbackRuleCreate = z.infer<typeof SetbackRuleCreate>;

export const NbcRuleCreate = z.object({
  clause: z.string().min(1).max(120),
  title: z.string().min(1).max(300),
  requirement: optStr,
  applicability: z.string().max(300).optional(),
  notes: optStr,
});
export type NbcRuleCreate = z.infer<typeof NbcRuleCreate>;

export const FireRuleCreate = z.object({
  buildingType: z.string().min(1).max(120),
  heightBandM: z.string().max(120).optional(),
  requirement: optStr,
  refugeArea: z.string().max(300).optional(),
  staircaseWidthM: z.number().nonnegative().optional(),
  notes: optStr,
});
export type FireRuleCreate = z.infer<typeof FireRuleCreate>;

export const RegulationCreate = z.object({
  authority: z.string().min(1).max(200),
  refNo: z.string().max(120).optional(),
  title: z.string().min(1).max(300),
  summary: optStr,
  link: z.string().max(500).optional(),
  notes: optStr,
});
export type RegulationCreate = z.infer<typeof RegulationCreate>;
