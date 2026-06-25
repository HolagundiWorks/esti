/**
 * Structural element catalogue — versioned structural element configurations
 * per IS:456 / IS:2502. Span is instance-specific; section grade and bar roles
 * are catalogue-defined (e.g. extra top = ¼ span at supports).
 */
import { z } from "zod";
import {
  STEEL_BAR_TYPES,
  STEEL_ELEMENT_TYPES,
  STEEL_STIRRUP_TYPES,
  steelDevelopmentLength,
  steelShapeCuttingLength,
  type SteelBarType,
  type SteelElementType,
  type SteelStirrupType,
} from "./steel-arranger.js";

export const StructuralCatalogLengthRule = z.enum([
  "FULL_SPAN",
  "SPAN_FRACTION",
  "FIXED_MM",
  "DEVELOPMENT_LENGTH",
]);
export type StructuralCatalogLengthRule = z.infer<typeof StructuralCatalogLengthRule>;

export const StructuralCatalogLengthRuleLabel: Record<StructuralCatalogLengthRule, string> = {
  FULL_SPAN: "Full span",
  SPAN_FRACTION: "Fraction of span",
  FIXED_MM: "Fixed length (mm)",
  DEVELOPMENT_LENGTH: "Development length Ld (IS:456 cl.26.2)",
};

export const StructuralCatalogRebarSpec = z.object({
  barMark: z.string().min(1).max(10),
  barType: z.enum(STEEL_BAR_TYPES),
  diaMm: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  shapeCode: z.string().max(4).default("A"),
  lengthRule: StructuralCatalogLengthRule.default("FULL_SPAN"),
  /** Used when lengthRule = SPAN_FRACTION (e.g. 0.25 = L/4 at support). */
  spanFraction: z.number().min(0.05).max(1).optional(),
  fixedLengthMm: z.number().int().min(100).max(30000).optional(),
});
export type StructuralCatalogRebarSpec = z.infer<typeof StructuralCatalogRebarSpec>;

export const StructuralCatalogStirrupSpec = z.object({
  diaMm: z.number().int().positive(),
  stirrupType: z.enum(STEEL_STIRRUP_TYPES).default("CLOSED"),
  spacingMm: z.number().int().min(50).max(500),
  hookAngle: z.number().int().default(135),
  zone: z.enum(["FULL", "END_ZONE", "MID_ZONE"]).default("FULL"),
});
export type StructuralCatalogStirrupSpec = z.infer<typeof StructuralCatalogStirrupSpec>;

export const StructuralCatalogEntry = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(40),
  elementType: z.enum(STEEL_ELEMENT_TYPES),
  widthMm: z.number().int().min(100).max(3000),
  depthMm: z.number().int().min(100).max(3000),
  coverMm: z.number().int().min(15).max(75).default(25),
  fck: z.number().int().default(25),
  fy: z.number().int().default(500),
  rebars: z.array(StructuralCatalogRebarSpec).min(1),
  stirrups: z.array(StructuralCatalogStirrupSpec).default([]),
  sourceCitation: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
});
export type StructuralCatalogEntry = z.infer<typeof StructuralCatalogEntry>;
export const StructuralCatalogEntryCreate = StructuralCatalogEntry;

/** Compute straight cutting length before shape-code adjustments. */
export function structuralCatalogBaseLengthMm(
  rebar: StructuralCatalogRebarSpec,
  spanMm: number,
  fck: number,
  fy: number,
): number {
  switch (rebar.lengthRule) {
    case "FULL_SPAN":
      return spanMm;
    case "SPAN_FRACTION":
      return Math.round(spanMm * (rebar.spanFraction ?? 0.25));
    case "FIXED_MM":
      return rebar.fixedLengthMm ?? spanMm;
    case "DEVELOPMENT_LENGTH":
      return steelDevelopmentLength(rebar.diaMm, fy, fck);
    default:
      return spanMm;
  }
}

export function structuralCatalogCuttingLengthMm(
  rebar: StructuralCatalogRebarSpec,
  spanMm: number,
  fck: number,
  fy: number,
): number {
  const base = structuralCatalogBaseLengthMm(rebar, spanMm, fck, fy);
  return steelShapeCuttingLength(rebar.shapeCode, base, rebar.diaMm);
}

export interface AppliedStructuralRebar {
  barMark: string;
  barType: SteelBarType;
  diaMm: number;
  quantity: number;
  shapeCode: string;
  cuttingLengthMm: number;
}

export interface AppliedStructuralStirrup {
  diaMm: number;
  stirrupType: SteelStirrupType;
  spacingMm: number;
  hookAngle: number;
  zone: "FULL" | "END_ZONE" | "MID_ZONE";
}

export interface AppliedStructuralElement {
  elementType: SteelElementType;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  fck: number;
  fy: number;
  rebars: AppliedStructuralRebar[];
  stirrups: AppliedStructuralStirrup[];
}

/** Instantiate catalogue entry for a given span (beam length / column height). */
export function applyStructuralCatalogEntry(
  entry: StructuralCatalogEntry,
  spanMm: number,
): AppliedStructuralElement {
  return {
    elementType: entry.elementType,
    lengthMm: spanMm,
    widthMm: entry.widthMm,
    depthMm: entry.depthMm,
    coverMm: entry.coverMm,
    fck: entry.fck,
    fy: entry.fy,
    rebars: entry.rebars.map((rebar) => ({
      barMark: rebar.barMark,
      barType: rebar.barType,
      diaMm: rebar.diaMm,
      quantity: rebar.quantity,
      shapeCode: rebar.shapeCode,
      cuttingLengthMm: structuralCatalogCuttingLengthMm(
        rebar,
        spanMm,
        entry.fck,
        entry.fy,
      ),
    })),
    stirrups: entry.stirrups.map((s) => ({ ...s })),
  };
}

/** Demo catalogue: rectangular beam 230 × 600 mm, M25, typical office framing. */
export const DEMO_BEAM_230x600_M25: StructuralCatalogEntry = {
  code: "BM-230x600-M25",
  name: "Rectangular beam 230 × 600 mm — M25",
  version: "1.0",
  elementType: "BEAM",
  widthMm: 230,
  depthMm: 600,
  coverMm: 25,
  fck: 25,
  fy: 500,
  description:
    "Typical interior beam: main top/bottom, extra bars at supports (L/4), skin bars for deep section, closed stirrups.",
  sourceCitation: "IS:456:2000 cl.26.5, IS:2502:1963",
  rebars: [
    {
      barMark: "T1",
      barType: "TOP_MAIN",
      diaMm: 16,
      quantity: 2,
      shapeCode: "A",
      lengthRule: "FULL_SPAN",
    },
    {
      barMark: "B1",
      barType: "BOTTOM_MAIN",
      diaMm: 20,
      quantity: 3,
      shapeCode: "A",
      lengthRule: "FULL_SPAN",
    },
    {
      barMark: "ET1",
      barType: "EXTRA_TOP",
      diaMm: 16,
      quantity: 2,
      shapeCode: "A",
      lengthRule: "SPAN_FRACTION",
      spanFraction: 0.25,
    },
    {
      barMark: "EB1",
      barType: "EXTRA_BOTTOM",
      diaMm: 12,
      quantity: 2,
      shapeCode: "A",
      lengthRule: "SPAN_FRACTION",
      spanFraction: 0.25,
    },
    {
      barMark: "SF1",
      barType: "SIDE_FACE",
      diaMm: 8,
      quantity: 2,
      shapeCode: "A",
      lengthRule: "FULL_SPAN",
    },
  ],
  stirrups: [
    {
      diaMm: 8,
      stirrupType: "CLOSED",
      spacingMm: 150,
      hookAngle: 135,
      zone: "FULL",
    },
  ],
};
