import { z } from "zod";

/**
 * Estimation OS (Phase 29) — component-based, progressive estimation contracts.
 *
 * Extends the flat estimate engine in `boq.ts`. Design-stage estimate first
 * (cost heads + calculation types + % clauses + non-modeled allowances), then
 * component-based execution detail (component master → auto-BOQ). Everything is
 * deterministic and money is integer **paise**. See
 * docs/esti/ESTIMATION-OS-ARCHITECTURE.md and docs/esti/IFC-COMPONENT-MAPPING.md.
 */

// --- Stage, cost head, calculation type, confidence -------------------------

/** A whole estimate is either a design-stage ballpark or execution detail. */
export const EstimateStage = z.enum(["DESIGN", "EXECUTION"]);
export type EstimateStage = z.infer<typeof EstimateStage>;

/** Top-level grouping of a design-stage estimate. */
export const CostHead = z.enum([
  "SUBSTRUCTURE",
  "SUPERSTRUCTURE",
  "FINISHES",
  "SERVICES",
  "EXTERNAL",
  "PRELIMS",
  "CONTINGENCY",
  "OTHER",
]);
export type CostHead = z.infer<typeof CostHead>;
export const COST_HEAD_LABEL: Record<CostHead, string> = {
  SUBSTRUCTURE: "Substructure",
  SUPERSTRUCTURE: "Superstructure",
  FINISHES: "Finishes",
  SERVICES: "Services (MEP)",
  EXTERNAL: "External works",
  PRELIMS: "Preliminaries",
  CONTINGENCY: "Contingency",
  OTHER: "Other",
};

/** How a line's amount is derived. */
export const CalculationType = z.enum([
  "RATE_BOOK", // qty × rate from a rate-book item (existing default)
  "AREA_RATE", // qty (area) × rate — design-stage ballpark
  "PERCENTAGE", // % of a basis (subtotal / cost head / selected items) — clauses
  "LUMPSUM", // fixed amount, qty = 1
  "COMPONENT", // generated from a component expansion (auto-BOQ)
  "NON_MODELED", // provisional allowance not yet modeled
]);
export type CalculationType = z.infer<typeof CalculationType>;
export const CALCULATION_TYPE_LABEL: Record<CalculationType, string> = {
  RATE_BOOK: "Rate book",
  AREA_RATE: "Area rate",
  PERCENTAGE: "Percentage",
  LUMPSUM: "Lumpsum",
  COMPONENT: "Component",
  NON_MODELED: "Non-modeled",
};

/** Confidence band for a design-stage estimate. */
export const EstimateConfidence = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type EstimateConfidence = z.infer<typeof EstimateConfidence>;

/** Basis a PERCENTAGE clause is computed against. */
export const BasisKind = z.enum(["SUBTOTAL", "COST_HEAD", "ITEMS"]);
export type BasisKind = z.infer<typeof BasisKind>;
export const BasisSelector = z.object({
  kind: BasisKind,
  costHead: CostHead.optional(),
  itemIds: z.array(z.string().uuid()).optional(),
});
export type BasisSelector = z.infer<typeof BasisSelector>;

// --- AORMS component code ----------------------------------------------------

/** `[LEVEL]-[DISCIPLINE]-[COMPONENT]-[SEQUENCE]`, e.g. `SB-STR-FT-01`. */
export const AORMS_CODE_RE = /^[A-Z0-9]{1,6}-[A-Z]{2,4}-[A-Z0-9]{1,8}-\d{2,3}$/;

export function aormsCode(
  level: string,
  discipline: string,
  component: string,
  sequence: number,
): string {
  const seq = String(sequence).padStart(2, "0");
  return `${level}-${discipline}-${component}-${seq}`.toUpperCase();
}

export function parseAormsCode(code: string):
  | { level: string; discipline: string; component: string; sequence: number }
  | null {
  const upper = code.toUpperCase();
  if (!AORMS_CODE_RE.test(upper)) return null;
  const parts = upper.split("-");
  return {
    level: parts[0]!,
    discipline: parts[1]!,
    component: parts[2]!,
    sequence: Number(parts[3]),
  };
}

// --- Quantity formula registry (deterministic) ------------------------------

/** Named quantity formulas. The component supplies params keyed by name. */
export const FormulaKey = z.enum([
  "VOLUME_LWH", // length × width × height/depth
  "AREA_LW", // length × width
  "AREA_DIRECT", // area param directly
  "LENGTH_DIRECT", // length param directly
  "WEIGHT_STEEL", // length × dia²/162 (round-bar weight)
  "COUNT", // count param directly
]);
export type FormulaKey = z.infer<typeof FormulaKey>;

export interface FormulaDef {
  key: FormulaKey;
  label: string;
  /** Required param keys. */
  inputs: string[];
  /** Default unit of measure of the result. */
  uom: string;
  fn: (p: Record<string, number>) => number;
}

function num(p: Record<string, number>, k: string): number {
  const v = p[k];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Formula input '${k}' is missing or not a finite number`);
  }
  return v;
}

export const FORMULA_REGISTRY: Record<FormulaKey, FormulaDef> = {
  VOLUME_LWH: {
    key: "VOLUME_LWH",
    label: "Volume (L × W × H)",
    inputs: ["length", "width", "height"],
    uom: "cum",
    fn: (p) => num(p, "length") * num(p, "width") * num(p, "height"),
  },
  AREA_LW: {
    key: "AREA_LW",
    label: "Area (L × W)",
    inputs: ["length", "width"],
    uom: "sqm",
    fn: (p) => num(p, "length") * num(p, "width"),
  },
  AREA_DIRECT: {
    key: "AREA_DIRECT",
    label: "Area (direct)",
    inputs: ["area"],
    uom: "sqm",
    fn: (p) => num(p, "area"),
  },
  LENGTH_DIRECT: {
    key: "LENGTH_DIRECT",
    label: "Length (direct)",
    inputs: ["length"],
    uom: "m",
    fn: (p) => num(p, "length"),
  },
  WEIGHT_STEEL: {
    key: "WEIGHT_STEEL",
    label: "Steel weight (L × d²/162)",
    inputs: ["length", "dia"],
    uom: "kg",
    fn: (p) => (num(p, "length") * num(p, "dia") ** 2) / 162,
  },
  COUNT: {
    key: "COUNT",
    label: "Count",
    inputs: ["count"],
    uom: "nos",
    fn: (p) => num(p, "count"),
  },
};

/** Evaluate a formula; result rounded to 4 dp for stable quantities. */
export function evalFormula(key: FormulaKey, params: Record<string, number>): number {
  const def = FORMULA_REGISTRY[key];
  if (!def) throw new Error(`Unknown formula '${key}'`);
  return Number(def.fn(params).toFixed(4));
}

/** Amount in paise of a percentage clause against a basis. */
export function percentageLineAmount(basisPaise: number, pct: number): number {
  return Math.round(basisPaise * (pct / 100));
}

// --- Component master --------------------------------------------------------

export const ComponentKind = z.enum(["PHYSICAL", "PROCESS"]);
export type ComponentKind = z.infer<typeof ComponentKind>;

export const ComponentDiscipline = z.enum([
  "STR", // structural
  "ARC", // architectural / masonry / finishes
  "MEP", // mechanical-electrical-plumbing (generic)
  "ELE", // electrical
  "PLM", // plumbing
  "HVA", // HVAC
  "FIR", // fire
  "EXT", // external works
  "INT", // interiors
  "EQP", // equipment
]);
export type ComponentDiscipline = z.infer<typeof ComponentDiscipline>;

export const ComponentRateSource = z.enum(["RATE_BOOK", "RATE_ANALYSIS", "MANUAL"]);
export type ComponentRateSource = z.infer<typeof ComponentRateSource>;

export const ComponentStatus = z.enum(["ACTIVE", "ARCHIVED"]);
export type ComponentStatus = z.infer<typeof ComponentStatus>;

/** A single input field on a component's parameter form. */
export const ComponentParamField = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  unit: z.string().max(20).default(""),
  type: z.enum(["NUMBER", "SELECT", "TEXT"]).default("NUMBER"),
  options: z.array(z.string()).max(40).optional(),
  required: z.boolean().default(true),
  defaultValue: z.number().optional(),
});
export type ComponentParamField = z.infer<typeof ComponentParamField>;

export const ComponentMasterCreate = z.object({
  code: z
    .string()
    .max(40)
    .regex(AORMS_CODE_RE, "Use [LEVEL]-[DISC]-[COMP]-[SEQ], e.g. SB-STR-FT-01"),
  name: z.string().min(1).max(200),
  level: z.string().min(1).max(20),
  discipline: ComponentDiscipline,
  componentType: z.string().min(1).max(40), // FOOTING, COLUMN, BEAM, …
  uom: z.string().min(1).max(20),
  kind: ComponentKind.default("PHYSICAL"),
  formulaKey: FormulaKey,
  paramSchema: z.array(ComponentParamField).max(20).default([]),
  rateSource: ComponentRateSource.default("RATE_BOOK"),
  dsrItemId: z.string().uuid().nullable().optional(),
  rateAnalysisId: z.string().uuid().nullable().optional(),
  /** null = shared library component; set = project-specific. */
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).optional(),
});
export type ComponentMasterCreate = z.infer<typeof ComponentMasterCreate>;

export const ComponentMasterUpdate = ComponentMasterCreate.partial().extend({
  id: z.string().uuid(),
  status: ComponentStatus.optional(),
});
export type ComponentMasterUpdate = z.infer<typeof ComponentMasterUpdate>;

// --- IFC → AORMS mapping catalog --------------------------------------------

export const IfcMappingCreate = z.object({
  ifcEntity: z.string().min(1).max(60), // IfcFooting
  predefinedType: z.string().max(60).nullable().optional(), // PAD_FOOTING
  componentId: z.string().uuid(),
  notes: z.string().max(400).optional(),
});
export type IfcMappingCreate = z.infer<typeof IfcMappingCreate>;

// --- Related-item templates (dependency sequences) --------------------------

export const ComponentRelatedCreate = z.object({
  parentComponentId: z.string().uuid(),
  childComponentId: z.string().uuid(),
  /** Override formula for the child; else child uses its own formula + params. */
  ratioFormulaKey: FormulaKey.nullable().optional(),
  /** Multiplier applied to the child's computed quantity. */
  qtyFactor: z.number().positive().default(1),
  sequence: z.number().int().default(0),
});
export type ComponentRelatedCreate = z.infer<typeof ComponentRelatedCreate>;

// --- Execution-detail link: component instance on an estimate ----------------

export const EstimateComponentCreate = z.object({
  estimateId: z.string().uuid(),
  componentId: z.string().uuid(),
  /** Optional design-stage item this component detail expands. */
  designItemId: z.string().uuid().nullable().optional(),
  params: z.record(z.string(), z.number()).default({}),
  costHead: CostHead.optional(),
  /** Expand related-item templates into BOQ lines as well. */
  includeRelated: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type EstimateComponentCreate = z.infer<typeof EstimateComponentCreate>;

// --- Design-stage item -------------------------------------------------------

/** Add or edit a design-stage estimate line (cost head + calculation type). */
export const DesignItemInput = z.object({
  estimateId: z.string().uuid(),
  costHead: CostHead.default("OTHER"),
  calculationType: CalculationType.default("AREA_RATE"),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20).default("nos"),
  qty: z.number().nonnegative().default(0),
  ratePaise: z.number().int().nonnegative().default(0),
  itemLeadPct: z.number().min(0).max(100).default(0),
  confidence: EstimateConfidence.default("MEDIUM"),
  /** PERCENTAGE clauses only. */
  pct: z.number().min(0).max(100).nullable().optional(),
  basis: BasisSelector.nullable().optional(),
  sortOrder: z.number().int().default(0),
});
export type DesignItemInput = z.infer<typeof DesignItemInput>;

export const DesignItemUpdate = DesignItemInput.partial().extend({
  id: z.string().uuid(),
});
export type DesignItemUpdate = z.infer<typeof DesignItemUpdate>;

/** Freeze the current estimate into an immutable version snapshot. */
export const EstimateFreezeInput = z.object({
  estimateId: z.string().uuid(),
  note: z.string().max(400).optional(),
});
export type EstimateFreezeInput = z.infer<typeof EstimateFreezeInput>;
