import { BAR_DIAS, bbsItemTotals } from "./boq.js";

export interface BbsItemLike {
  barMark: string;
  member?: string | null;
  diaMm: number;
  noOfMembers: number;
  barsPerMember: number;
  cuttingLengthMm: number;
  weightKg?: number;
}

export type BbsValidationSeverity = "error" | "warning";

export interface BbsValidationIssue {
  code: string;
  severity: BbsValidationSeverity;
  message: string;
  barMark?: string;
}

export interface BbsScheduleValidation {
  ok: boolean;
  issues: BbsValidationIssue[];
  totalWeightKg: number;
  itemCount: number;
}

const MAX_CUTTING_MM = 50_000;

/** Validate a single BBS line against engineering rules. */
export function validateBbsItem(item: BbsItemLike): BbsValidationIssue[] {
  const issues: BbsValidationIssue[] = [];
  const mark = item.barMark?.trim();

  if (!mark) {
    issues.push({
      code: "MISSING_MARK",
      severity: "error",
      message: "Bar mark is required",
    });
  }

  if (!(BAR_DIAS as readonly number[]).includes(item.diaMm)) {
    issues.push({
      code: "INVALID_DIA",
      severity: "error",
      message: `Diameter ${item.diaMm} mm is not a standard bar size`,
      barMark: mark,
    });
  }

  if (item.noOfMembers < 1 || !Number.isInteger(item.noOfMembers)) {
    issues.push({
      code: "INVALID_MEMBERS",
      severity: "error",
      message: "Number of members must be a positive integer",
      barMark: mark,
    });
  }

  if (item.barsPerMember < 1 || !Number.isInteger(item.barsPerMember)) {
    issues.push({
      code: "INVALID_BARS",
      severity: "error",
      message: "Bars per member must be a positive integer",
      barMark: mark,
    });
  }

  if (item.cuttingLengthMm <= 0) {
    issues.push({
      code: "INVALID_LENGTH",
      severity: "error",
      message: "Cutting length must be greater than zero",
      barMark: mark,
    });
  } else if (item.cuttingLengthMm > MAX_CUTTING_MM) {
    issues.push({
      code: "LENGTH_EXCESS",
      severity: "error",
      message: `Cutting length exceeds ${MAX_CUTTING_MM} mm limit`,
      barMark: mark,
    });
  }

  if (item.weightKg != null) {
    const computed = bbsItemTotals({
      diaMm: item.diaMm,
      noOfMembers: item.noOfMembers,
      barsPerMember: item.barsPerMember,
      cuttingLengthMm: item.cuttingLengthMm,
    });
    if (Math.abs(computed.weightKg - item.weightKg) > 0.02) {
      issues.push({
        code: "WEIGHT_MISMATCH",
        severity: "error",
        message: `Stored weight ${item.weightKg} kg does not match calculated ${computed.weightKg} kg`,
        barMark: mark,
      });
    }
  }

  return issues;
}

/** Validate an entire schedule before export or PDF issue. */
export function validateBbsSchedule(items: BbsItemLike[]): BbsScheduleValidation {
  const issues: BbsValidationIssue[] = [];

  if (items.length === 0) {
    issues.push({
      code: "EMPTY_SCHEDULE",
      severity: "error",
      message: "Add at least one bar row before export or issue",
    });
    return { ok: false, issues, totalWeightKg: 0, itemCount: 0 };
  }

  const marks = new Map<string, number>();
  let totalWeightKg = 0;

  for (const item of items) {
    issues.push(...validateBbsItem(item));
    const computed = bbsItemTotals({
      diaMm: item.diaMm,
      noOfMembers: item.noOfMembers,
      barsPerMember: item.barsPerMember,
      cuttingLengthMm: item.cuttingLengthMm,
    });
    totalWeightKg += item.weightKg ?? computed.weightKg;

    const mark = item.barMark.trim().toUpperCase();
    marks.set(mark, (marks.get(mark) ?? 0) + 1);
  }

  for (const [mark, count] of marks) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_MARK",
        severity: "warning",
        message: `Bar mark "${mark}" appears ${count} times — confirm this is intentional`,
        barMark: mark,
      });
    }
  }

  const hasError = issues.some((i) => i.severity === "error");
  return {
    ok: !hasError,
    issues,
    totalWeightKg: Number(totalWeightKg.toFixed(2)),
    itemCount: items.length,
  };
}
