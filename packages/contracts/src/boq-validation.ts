import { z } from "zod";

/**
 * Construction Cost OS Future row (ref §3.3) — BOQ-validation checklist.
 *
 * A deterministic "checker" over an estimate's BOQ lines, surfacing data-quality
 * warnings before a BOQ is frozen / tendered. Like the Phase-G risk checks, this
 * is arithmetic over the data (§9 — never an LLM that could "silently approve"),
 * advisory only: it returns warnings with a severity; nothing here mutates or
 * blocks anything. Pure for unit testing.
 *
 * The reference list (missing UOM, zero/negative qty, duplicate description,
 * missing spec/drawing ref, item without trade/package, stale drawing revision)
 * is adapted to ESTI's `esti_estimate_item` columns — estimate lines carry no
 * spec/drawing-ref or drawing-revision column, so those two reference checks are
 * replaced with the data-integrity checks the real schema supports.
 */

// --- Kinds + severity -------------------------------------------------------

export const BoqValidationKind = z.enum([
  "MISSING_UOM",
  "NON_POSITIVE_QTY",
  "ZERO_RATE",
  "DUPLICATE_DESCRIPTION",
  "MISSING_COST_HEAD",
  "PERCENTAGE_WITHOUT_BASIS",
  "COMPONENT_WITHOUT_LINK",
]);
export type BoqValidationKind = z.infer<typeof BoqValidationKind>;

export const BOQ_VALIDATION_LABEL: Record<BoqValidationKind, string> = {
  MISSING_UOM: "Missing unit of measure",
  NON_POSITIVE_QTY: "Zero or negative quantity",
  ZERO_RATE: "Zero rate",
  DUPLICATE_DESCRIPTION: "Duplicate description",
  MISSING_COST_HEAD: "No trade / cost head",
  PERCENTAGE_WITHOUT_BASIS: "Percentage item without a basis",
  COMPONENT_WITHOUT_LINK: "Component item without a component link",
};

export const BoqValidationSeverity = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type BoqValidationSeverity = z.infer<typeof BoqValidationSeverity>;

/** Carbon `Tag` type per severity — single source so the office UI stays Pure Carbon. */
export const BOQ_VALIDATION_TAG: Record<
  BoqValidationSeverity,
  "red" | "magenta" | "blue"
> = {
  HIGH: "red",
  MEDIUM: "magenta",
  LOW: "blue",
};

// --- Inputs + output --------------------------------------------------------

/** The subset of `esti_estimate_item` columns the checks read. DB-free testable. */
export interface BoqValidationItem {
  id: string;
  description: string;
  unit: string;
  qty: number;
  ratePaise: number;
  costHead: string | null;
  /** RATE_BOOK | AREA_RATE | PERCENTAGE | LUMPSUM | COMPONENT | NON_MODELED. */
  calculationType: string;
  pct: number | null;
  /** PERCENTAGE basis selector — empty object ⇒ no basis chosen. */
  basisSelector: unknown;
  componentId: string | null;
  estimateComponentId: string | null;
  sortOrder: number;
}

export interface BoqValidationIssue {
  kind: BoqValidationKind;
  severity: BoqValidationSeverity;
  itemId: string;
  /** Short line label: the description, or `Item #<n>` when blank. */
  line: string;
  detail: string;
}

export interface BoqValidationSummary {
  high: number;
  medium: number;
  low: number;
  total: number;
  clean: boolean;
}

// --- Pure helpers -----------------------------------------------------------

const SEVERITY_RANK: Record<BoqValidationSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/** Calc types whose value is not quantity-driven (a qty of 0 is legitimate). */
const NON_QTY_TYPES = new Set(["PERCENTAGE", "NON_MODELED"]);
/** Calc types whose unit rate is derived elsewhere (a rate of 0 is legitimate). */
const NON_RATE_TYPES = new Set(["PERCENTAGE", "NON_MODELED"]);

function lineLabel(item: BoqValidationItem): string {
  const desc = item.description.trim();
  return desc.length > 0 ? desc : `Item #${item.sortOrder + 1}`;
}

function isEmptyBasis(basis: unknown): boolean {
  if (basis == null) return true;
  if (typeof basis === "object") return Object.keys(basis as object).length === 0;
  return false;
}

/**
 * Run the deterministic BOQ checks over an estimate's items. Advisory only — the
 * caller surfaces them; nothing here approves, blocks, or mutates. Issues are
 * returned sorted by severity (HIGH first) then the item's sort order.
 */
export function validateBoqItems(items: BoqValidationItem[]): BoqValidationIssue[] {
  const issues: BoqValidationIssue[] = [];

  // Duplicate-description groups (trim + lowercase; blank descriptions ignored).
  const byDesc = new Map<string, BoqValidationItem[]>();
  for (const it of items) {
    const key = it.description.trim().toLowerCase();
    if (key.length === 0) continue;
    const bucket = byDesc.get(key);
    if (bucket) bucket.push(it);
    else byDesc.set(key, [it]);
  }

  for (const it of items) {
    const line = lineLabel(it);

    if (it.unit.trim().length === 0) {
      issues.push({
        kind: "MISSING_UOM",
        severity: "HIGH",
        itemId: it.id,
        line,
        detail: `"${line}" has no unit of measure.`,
      });
    }

    if (!NON_QTY_TYPES.has(it.calculationType) && it.qty <= 0) {
      issues.push({
        kind: "NON_POSITIVE_QTY",
        severity: "HIGH",
        itemId: it.id,
        line,
        detail: `"${line}" has a quantity of ${fmtQty(it.qty)}.`,
      });
    }

    if (!NON_RATE_TYPES.has(it.calculationType) && it.ratePaise <= 0) {
      issues.push({
        kind: "ZERO_RATE",
        severity: "MEDIUM",
        itemId: it.id,
        line,
        detail: `"${line}" has no rate.`,
      });
    }

    if (!it.costHead || it.costHead.trim().length === 0) {
      issues.push({
        kind: "MISSING_COST_HEAD",
        severity: "LOW",
        itemId: it.id,
        line,
        detail: `"${line}" is not assigned to a trade / cost head.`,
      });
    }

    if (
      it.calculationType === "PERCENTAGE" &&
      ((it.pct ?? 0) <= 0 || isEmptyBasis(it.basisSelector))
    ) {
      issues.push({
        kind: "PERCENTAGE_WITHOUT_BASIS",
        severity: "MEDIUM",
        itemId: it.id,
        line,
        detail: `"${line}" is a percentage item but has no percentage / basis set.`,
      });
    }

    if (
      it.calculationType === "COMPONENT" &&
      !it.componentId &&
      !it.estimateComponentId
    ) {
      issues.push({
        kind: "COMPONENT_WITHOUT_LINK",
        severity: "LOW",
        itemId: it.id,
        line,
        detail: `"${line}" is a component item but is not linked to a component.`,
      });
    }
  }

  for (const bucket of byDesc.values()) {
    if (bucket.length < 2) continue;
    for (const it of bucket) {
      const line = lineLabel(it);
      issues.push({
        kind: "DUPLICATE_DESCRIPTION",
        severity: "LOW",
        itemId: it.id,
        line,
        detail: `"${line}" appears on ${bucket.length} lines — merge or differentiate them.`,
      });
    }
  }

  return issues.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const ai = items.findIndex((i) => i.id === a.itemId);
    const bi = items.findIndex((i) => i.id === b.itemId);
    return ai - bi;
  });
}

/** Roll the issues into per-severity counts + a clean flag for the header chip. */
export function summarizeBoqValidation(
  issues: BoqValidationIssue[],
): BoqValidationSummary {
  const high = issues.filter((i) => i.severity === "HIGH").length;
  const medium = issues.filter((i) => i.severity === "MEDIUM").length;
  const low = issues.filter((i) => i.severity === "LOW").length;
  return { high, medium, low, total: issues.length, clean: issues.length === 0 };
}

/** Compact quantity for issue detail (avoids a money dependency here). */
function fmtQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}
