import { z } from "zod";

/**
 * ESE (Estimation Specification Engine) published pack schemas — the stable seam
 * between the ESE and everything that consumes it (the Estimate desktop app and
 * AORMS). Two pack types: a Rate Library Pack (rates/specs/recipes) and a
 * Compliance/Bylaw Rule Pack (NBC + planning bylaws). Money is integer paise.
 * See docs/esti/ESTIMATION-SPEC-ENGINE.md + ESTIMATION-ARCHITECTURE.md.
 */

export const PACK_FORMAT_VERSION = 1;

// ── Measurement template — which of Nos·L·B·H the estimator punches vs. baked ──
export const MeasurementFactor = z.object({
  mode: z.enum(["PUNCHED", "FIXED", "OFF"]),
  /** Required when mode === "FIXED": the baked dimension (m) or count. */
  value: z.number().nonnegative().optional(),
});
export type MeasurementFactor = z.infer<typeof MeasurementFactor>;

export const MeasurementTemplate = z.object({
  nos: MeasurementFactor,
  l: MeasurementFactor,
  b: MeasurementFactor,
  h: MeasurementFactor,
});
export type MeasurementTemplate = z.infer<typeof MeasurementTemplate>;

// ── Derivation rule — one measurement → linked quantities (brick→plaster→paint) ─
export const DerivationRule = z.object({
  childItemCode: z.string(),
  rule: z.enum(["FACTOR", "NET_OF_OPENINGS", "PERIMETER_X_HEIGHT"]),
  factor: z.number().default(1),
});
export type DerivationRule = z.infer<typeof DerivationRule>;

// ── Rate Library entities ─────────────────────────────────────────────────────
export const RateLibraryWorkItem = z.object({
  code: z.string(),
  name: z.string(),
  discipline: z.string().optional(),
  defaultUom: z.string().optional(),
});

export const RateLibraryRateItem = z.object({
  code: z.string(),
  itemCode: z.string(), // → RateLibraryWorkItem.code
  shortName: z.string(),
  specification: z.string().optional(),
  attributes: z.record(z.string(), z.string()).default({}), // { Thickness:"230mm", Mortar:"1:3" }
  uom: z.string(),
  ratePaise: z.number().int().nonnegative(),
  measurementTemplate: MeasurementTemplate.optional(),
  derivations: z.array(DerivationRule).default([]),
  source: z.string().optional(), // e.g. "CPWD-DSR-2023"
  effectiveFrom: z.string().optional(), // ISO date
});

export const RateLibraryMaterial = z.object({
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  ratePaise: z.number().int().nonnegative().optional(),
  density: z.number().optional(),
});

export const RateLibraryRecipe = z.object({
  rateItemCode: z.string(),
  materialCode: z.string(),
  coefficient: z.number().nonnegative(), // material qty per 1 UOM of the rate item
  wastagePct: z.number().nonnegative().default(0),
});

export const RateLibrarySpec = z.object({
  code: z.string(),
  text: z.string(),
});

export const RateLibraryPack = z.object({
  formatVersion: z.literal(PACK_FORMAT_VERSION),
  packType: z.literal("RATE_LIBRARY"),
  source: z.string(), // "CPWD", "KAR-PWD", …
  year: z.number().int(),
  edition: z.string(), // "CPWD-DSR-2023"
  checksum: z.string(),
  currency: z.literal("INR").default("INR"),
  workItems: z.array(RateLibraryWorkItem).default([]),
  rateItems: z.array(RateLibraryRateItem).default([]),
  materials: z.array(RateLibraryMaterial).default([]),
  recipes: z.array(RateLibraryRecipe).default([]),
  specs: z.array(RateLibrarySpec).default([]),
});
export type RateLibraryPack = z.infer<typeof RateLibraryPack>;

// ── Compliance / Bylaw Rule Pack — NBC 2016 + state planning bylaws ───────────
// A generic, applicability-scoped rule so diverse bylaws normalise to one shape.
export const BylawRule = z.object({
  kind: z.enum(["FAR", "SETBACK", "HEIGHT", "GROUND_COVERAGE", "PARKING", "OTHER"]),
  /** When this rule applies — plot/road/zone predicates (all optional). */
  applicability: z
    .object({
      zone: z.string().optional(),
      plotAreaMinSqm: z.number().optional(),
      plotAreaMaxSqm: z.number().optional(),
      roadWidthMinM: z.number().optional(),
      occupancy: z.string().optional(),
    })
    .default({}),
  /** The rule payload — value + unit + free-form params (side/front/rear, ratios…). */
  value: z.number().optional(),
  unit: z.string().optional(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  clause: z.string().optional(), // citation
});
export type BylawRule = z.infer<typeof BylawRule>;

export const BylawRulePack = z.object({
  formatVersion: z.literal(PACK_FORMAT_VERSION),
  packType: z.literal("BYLAW_RULES"),
  authority: z.string(), // "NBC-2016", "BBMP", "TN-DTCP", …
  year: z.number().int(),
  edition: z.string(),
  checksum: z.string(),
  rules: z.array(BylawRule).default([]),
});
export type BylawRulePack = z.infer<typeof BylawRulePack>;

export const EsePack = z.discriminatedUnion("packType", [RateLibraryPack, BylawRulePack]);
export type EsePack = z.infer<typeof EsePack>;
