import { describe, expect, it } from "vitest";
import {
  CHECK_CATEGORY_RANK,
  CHECK_CATEGORY_REQUIRED_STEPS,
  CONSULTANCY_BRIEF_TEMPLATES,
  CONSULTANCY_SCOPE_TEMPLATES,
  CONS_GRADE_LABEL,
  ConsEngagementCreate,
  ConsFeeStageCreate,
  ConsGrade,
  ConsTimesheetCreate,
  ConsVariationCreate,
  ConsultancyType,
  EngineeringDiscipline,
  FEE_STAGE_STATUS_LABEL,
  FeeStageStatus,
  missingReviewSteps,
  relianceLetterStatus,
} from "./consultancy.js";

describe("missingReviewSteps", () => {
  it("requires only APPROVE for CAT0", () => {
    expect(missingReviewSteps("CAT0", [])).toEqual(["APPROVE"]);
    expect(missingReviewSteps("CAT0", ["APPROVE"])).toEqual([]);
  });

  it("requires CHECK then APPROVE for CAT1 and CAT2", () => {
    expect(missingReviewSteps("CAT1", [])).toEqual(["CHECK", "APPROVE"]);
    expect(missingReviewSteps("CAT2", ["CHECK"])).toEqual(["APPROVE"]);
    expect(missingReviewSteps("CAT2", ["CHECK", "APPROVE"])).toEqual([]);
  });

  it("requires the full CHECK/APPROVE/VERIFY chain for CAT3", () => {
    expect(missingReviewSteps("CAT3", [])).toEqual(["CHECK", "APPROVE", "VERIFY"]);
    expect(missingReviewSteps("CAT3", ["CHECK", "APPROVE"])).toEqual(["VERIFY"]);
    expect(missingReviewSteps("CAT3", ["APPROVE", "CHECK", "VERIFY"])).toEqual([]);
  });

  it("preserves the required chain order regardless of recorded order", () => {
    expect(missingReviewSteps("CAT3", ["VERIFY"])).toEqual(["CHECK", "APPROVE"]);
  });

  it("falls back to the CAT1 chain for an unknown category", () => {
    expect(missingReviewSteps("BOGUS", [])).toEqual(["CHECK", "APPROVE"]);
  });

  it("only CAT3 requires an independent proof check (VERIFY)", () => {
    for (const cat of ["CAT0", "CAT1", "CAT2"] as const) {
      expect(CHECK_CATEGORY_REQUIRED_STEPS[cat]).not.toContain("VERIFY");
    }
    expect(CHECK_CATEGORY_REQUIRED_STEPS.CAT3).toContain("VERIFY");
  });
});

describe("CHECK_CATEGORY_RANK", () => {
  it("is strictly increasing with rigour and detects downgrades", () => {
    expect(CHECK_CATEGORY_RANK.CAT0).toBeLessThan(CHECK_CATEGORY_RANK.CAT1);
    expect(CHECK_CATEGORY_RANK.CAT1).toBeLessThan(CHECK_CATEGORY_RANK.CAT2);
    expect(CHECK_CATEGORY_RANK.CAT2).toBeLessThan(CHECK_CATEGORY_RANK.CAT3);
    // A downgrade is any move to a strictly lower rank.
    expect(CHECK_CATEGORY_RANK.CAT1 < CHECK_CATEGORY_RANK.CAT3).toBe(true);
  });
});

describe("relianceLetterStatus", () => {
  const today = "2026-07-21";

  it("reports REVOKED whenever revokedAt is set, even before expiry", () => {
    expect(relianceLetterStatus({ revokedAt: new Date(), expiresOn: "2027-01-01" }, today)).toBe(
      "REVOKED",
    );
    expect(relianceLetterStatus({ revokedAt: "2026-07-01" }, today)).toBe("REVOKED");
  });

  it("reports EXPIRED when the expiry is strictly in the past", () => {
    expect(relianceLetterStatus({ expiresOn: "2026-07-20" }, today)).toBe("EXPIRED");
  });

  it("reports LIVE on the expiry day itself (boundary) and in the future", () => {
    expect(relianceLetterStatus({ expiresOn: today }, today)).toBe("LIVE");
    expect(relianceLetterStatus({ expiresOn: "2026-12-31" }, today)).toBe("LIVE");
  });

  it("reports LIVE when there is no expiry and no revocation", () => {
    expect(relianceLetterStatus({}, today)).toBe("LIVE");
    expect(relianceLetterStatus({ revokedAt: null, expiresOn: null }, today)).toBe("LIVE");
  });
});

describe("ConsEngagementCreate schema", () => {
  const base = { title: "Tower B structural", model: "FULL_DESIGN", leadDiscipline: "STRUCTURAL" };

  it("accepts a minimal valid engagement", () => {
    expect(ConsEngagementCreate.safeParse(base).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(ConsEngagementCreate.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects an unknown engagement model or discipline", () => {
    expect(ConsEngagementCreate.safeParse({ ...base, model: "SUB_CONSULTANT" }).success).toBe(false);
    expect(ConsEngagementCreate.safeParse({ ...base, leadDiscipline: "PLUMBING" }).success).toBe(
      false,
    );
  });

  it("rejects a fractional or negative agreed fee (paise are integers)", () => {
    expect(ConsEngagementCreate.safeParse({ ...base, feeTotalPaise: 100.5 }).success).toBe(false);
    expect(ConsEngagementCreate.safeParse({ ...base, feeTotalPaise: -1 }).success).toBe(false);
    expect(ConsEngagementCreate.safeParse({ ...base, feeTotalPaise: 500000 }).success).toBe(true);
  });
});

describe("ConsTimesheetCreate schema", () => {
  const base = {
    engagementId: "11111111-1111-4111-8111-111111111111",
    date: "2026-07-21",
    grade: "ENGINEER" as const,
    hours: 8,
  };

  it("accepts a valid entry", () => {
    expect(ConsTimesheetCreate.safeParse(base).success).toBe(true);
  });

  it("enforces the 0 < hours <= 24 range", () => {
    expect(ConsTimesheetCreate.safeParse({ ...base, hours: 0 }).success).toBe(false);
    expect(ConsTimesheetCreate.safeParse({ ...base, hours: -3 }).success).toBe(false);
    expect(ConsTimesheetCreate.safeParse({ ...base, hours: 24 }).success).toBe(true);
    expect(ConsTimesheetCreate.safeParse({ ...base, hours: 24.5 }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(ConsTimesheetCreate.safeParse({ ...base, date: "21-07-2026" }).success).toBe(false);
  });
});

describe("ConsFeeStageCreate & ConsVariationCreate schemas", () => {
  it("requires a label and non-negative integer paise on a fee stage", () => {
    const ok = ConsFeeStageCreate.safeParse({
      engagementId: "11111111-1111-4111-8111-111111111111",
      label: "Stage 3 — GA drawings",
      amountPaise: 2500000,
    });
    expect(ok.success).toBe(true);
    expect(
      ConsFeeStageCreate.safeParse({
        engagementId: "11111111-1111-4111-8111-111111111111",
        label: "",
        amountPaise: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects a negative variation amount", () => {
    expect(
      ConsVariationCreate.safeParse({
        engagementId: "11111111-1111-4111-8111-111111111111",
        code: "VO-001",
        title: "Revised wind loading",
        amountPaise: -100,
      }).success,
    ).toBe(false);
  });
});

describe("template + label completeness", () => {
  it("has a scope template and a brief template for every consultancy type", () => {
    for (const type of ConsultancyType.options) {
      expect(CONSULTANCY_SCOPE_TEMPLATES[type], `scope template for ${type}`).toBeDefined();
      expect(Array.isArray(CONSULTANCY_BRIEF_TEMPLATES[type]), `brief template for ${type}`).toBe(
        true,
      );
    }
  });

  it("covers every grade and fee-stage status in its label map", () => {
    for (const grade of ConsGrade.options) expect(CONS_GRADE_LABEL[grade]).toBeTruthy();
    for (const status of FeeStageStatus.options) expect(FEE_STAGE_STATUS_LABEL[status]).toBeTruthy();
  });

  it("brief-template fields declare a valid kind", () => {
    const kinds = new Set(["number", "text", "choice", "boolean"]);
    for (const type of ConsultancyType.options) {
      for (const field of CONSULTANCY_BRIEF_TEMPLATES[type]) {
        expect(kinds.has(field.kind), `${type}.${field.key} kind ${field.kind}`).toBe(true);
      }
    }
  });

  it("exposes at least the core engineering disciplines", () => {
    expect(EngineeringDiscipline.options).toContain("STRUCTURAL");
    expect(EngineeringDiscipline.options.length).toBeGreaterThan(1);
  });
});
