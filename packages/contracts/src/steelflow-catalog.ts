/**
 * SteelFlow Knowledge Bank catalogue — versioned structural element configurations
 * per IS:456 / IS:2502. Span is instance-specific; section grade and bar roles
 * are catalogue-defined (e.g. extra top = ¼ span at supports).
 */
import { z } from "zod";
import {
  SF_BAR_TYPES,
  SF_ELEMENT_TYPES,
  SF_STIRRUP_TYPES,
  sfDevelopmentLength,
  sfShapeCuttingLength,
  type SfBarType,
  type SfElementType,
  type SfStirrupType,
} from "./steel-arranger.js";

export const SfCatalogLengthRule = z.enum([
  "FULL_SPAN",
  "SPAN_FRACTION",
  "FIXED_MM",
  "DEVELOPMENT_LENGTH",
]);
export type SfCatalogLengthRule = z.infer<typeof SfCatalogLengthRule>;

export const SfCatalogLengthRuleLabel: Record<SfCatalogLengthRule, string> = {
  FULL_SPAN: "Full span",
  SPAN_FRACTION: "Fraction of span",
  FIXED_MM: "Fixed length (mm)",
  DEVELOPMENT_LENGTH: "Development length Ld (IS:456 cl.26.2)",
};

export const SfCatalogRebarSpec = z.object({
  barMark: z.string().min(1).max(10),
  barType: z.enum(SF_BAR_TYPES),
  diaMm: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  shapeCode: z.string().max(4).default("A"),
  lengthRule: SfCatalogLengthRule.default("FULL_SPAN"),
  /** Used when lengthRule = SPAN_FRACTION (e.g. 0.25 = L/4 at support). */
  spanFraction: z.number().min(0.05).max(1).optional(),
  fixedLengthMm: z.number().int().min(100).max(30000).optional(),
});
export type SfCatalogRebarSpec = z.infer<typeof SfCatalogRebarSpec>;

export const SfCatalogStirrupSpec = z.object({
  diaMm: z.number().int().positive(),
  stirrupType: z.enum(SF_STIRRUP_TYPES).default("CLOSED"),
  spacingMm: z.number().int().min(50).max(500),
  hookAngle: z.number().int().default(135),
  zone: z.enum(["FULL", "END_ZONE", "MID_ZONE"]).default("FULL"),
});
export type SfCatalogStirrupSpec = z.infer<typeof SfCatalogStirrupSpec>;

export const SteelFlowCatalogEntry = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(40),
  elementType: z.enum(SF_ELEMENT_TYPES),
  widthMm: z.number().int().min(100).max(3000),
  depthMm: z.number().int().min(100).max(3000),
  coverMm: z.number().int().min(15).max(75).default(25),
  fck: z.number().int().default(25),
  fy: z.number().int().default(500),
  rebars: z.array(SfCatalogRebarSpec).min(1),
  stirrups: z.array(SfCatalogStirrupSpec).default([]),
  sourceCitation: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
});
export type SteelFlowCatalogEntry = z.infer<typeof SteelFlowCatalogEntry>;
export const SteelFlowCatalogEntryCreate = SteelFlowCatalogEntry;

/** Persisted row shape inside `geometry` / `reinforcement` jsonb columns. */
export const SteelFlowCatalogPersisted = z.object({
  geometry: z.object({
    widthMm: z.number(),
    depthMm: z.number(),
    coverMm: z.number(),
    fck: z.number(),
    fy: z.number(),
    elementType: z.enum(SF_ELEMENT_TYPES),
  }),
  reinforcement: z.object({
    rebars: z.array(SfCatalogRebarSpec),
    stirrups: z.array(SfCatalogStirrupSpec),
  }),
});
export type SteelFlowCatalogPersisted = z.infer<typeof SteelFlowCatalogPersisted>;

export function steelFlowCatalogToPersisted(
  entry: SteelFlowCatalogEntry,
): SteelFlowCatalogPersisted {
  return {
    geometry: {
      widthMm: entry.widthMm,
      depthMm: entry.depthMm,
      coverMm: entry.coverMm,
      fck: entry.fck,
      fy: entry.fy,
      elementType: entry.elementType,
    },
    reinforcement: {
      rebars: entry.rebars,
      stirrups: entry.stirrups,
    },
  };
}

export function parseSteelFlowCatalogRow(row: {
  code: string;
  name: string;
  version: string;
  family: string;
  description?: string | null;
  geometry: unknown;
  reinforcement: unknown;
  sourceCitation?: string | null;
}): SteelFlowCatalogEntry | null {
  const geo = row.geometry as Record<string, unknown>;
  const reinf = row.reinforcement as Record<string, unknown>;
  if (!Array.isArray(reinf.rebars)) return null;
  const elementType = (geo.elementType ?? row.family) as SfElementType;
  const parsed = SteelFlowCatalogEntry.safeParse({
    code: row.code,
    name: row.name,
    version: row.version,
    elementType,
    widthMm: geo.widthMm,
    depthMm: geo.depthMm,
    coverMm: geo.coverMm ?? 25,
    fck: geo.fck ?? 25,
    fy: geo.fy ?? 500,
    rebars: reinf.rebars,
    stirrups: reinf.stirrups ?? [],
    sourceCitation: row.sourceCitation ?? undefined,
    description: row.description ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

/** Compute straight cutting length before shape-code adjustments. */
export function sfCatalogBaseLengthMm(
  rebar: SfCatalogRebarSpec,
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
      return sfDevelopmentLength(rebar.diaMm, fy, fck);
    default:
      return spanMm;
  }
}

export function sfCatalogCuttingLengthMm(
  rebar: SfCatalogRebarSpec,
  spanMm: number,
  fck: number,
  fy: number,
): number {
  const base = sfCatalogBaseLengthMm(rebar, spanMm, fck, fy);
  return sfShapeCuttingLength(rebar.shapeCode, base, rebar.diaMm);
}

export interface AppliedSteelFlowRebar {
  barMark: string;
  barType: SfBarType;
  diaMm: number;
  quantity: number;
  shapeCode: string;
  cuttingLengthMm: number;
}

export interface AppliedSteelFlowStirrup {
  diaMm: number;
  stirrupType: SfStirrupType;
  spacingMm: number;
  hookAngle: number;
  zone: "FULL" | "END_ZONE" | "MID_ZONE";
}

export interface AppliedSteelFlowElement {
  elementType: SfElementType;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  fck: number;
  fy: number;
  rebars: AppliedSteelFlowRebar[];
  stirrups: AppliedSteelFlowStirrup[];
}

/** Instantiate catalogue entry for a given span (beam length / column height). */
export function applySteelFlowCatalogEntry(
  entry: SteelFlowCatalogEntry,
  spanMm: number,
): AppliedSteelFlowElement {
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
      cuttingLengthMm: sfCatalogCuttingLengthMm(
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
export const DEMO_BEAM_230x600_M25: SteelFlowCatalogEntry = {
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
