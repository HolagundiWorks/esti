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
  canAdvanceFeeStage,
  canAdvanceCalcPackage,
  canDecideVariation,
  canRaiseCheckCategory,
  canTransitionDeliverable,
  computeFeePosition,
  buildCapacityOutlook,
  buildDeliverableLineage,
  buildMdrDeliverableCode,
  capacityOutlookAlerts,
  feeStageFinancialsLocked,
  isValidMdrDeliverableCode,
  mayIssueDeliverable,
  missingReviewSteps,
  nextMdrSequence,
  parseMdrDeliverableCode,
  rankPrecedentEngagements,
  realisationRatio,
  relianceLetterStatus,
  reviewStepIndependenceError,
  sumFirmWip,
  timesheetValuePaise,
  variationDeletionBlocked,
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

describe("computeFeePosition", () => {
  const stages = [
    { amountPaise: 100_000, status: "PENDING" },
    { amountPaise: 200_000, status: "BILLABLE" },
    { amountPaise: 300_000, status: "INVOICED" },
    { amountPaise: 400_000, status: "PAID" },
  ];
  const timesheets = [
    { hours: 2, valuePaise: 50_000, status: "APPROVED" },
    { hours: 1.5, valuePaise: 30_000, status: "SUBMITTED" },
  ];

  it("splits invoiced-ever vs outstanding receivables and floors WIP", () => {
    const pos = computeFeePosition({ agreedPaise: 1_000_000, stages, timesheets });
    expect(pos.agreedPaise).toBe(1_000_000);
    expect(pos.stagedPaise).toBe(1_000_000);
    expect(pos.billablePaise).toBe(200_000);
    expect(pos.invoicedPaise).toBe(700_000); // INVOICED ∪ PAID
    expect(pos.paidPaise).toBe(400_000);
    expect(pos.outstandingPaise).toBe(300_000); // INVOICED only
    expect(pos.hoursBooked).toBe(3.5);
    expect(pos.pendingApproval).toBe(1);
    expect(pos.timeValuePaise).toBe(80_000);
    // timeValue < invoiced → WIP floors at 0
    expect(pos.wipPaise).toBe(0);
  });

  it("reports positive WIP when time value exceeds invoiced-ever", () => {
    const pos = computeFeePosition({
      agreedPaise: 0,
      stages: [{ amountPaise: 10_000, status: "INVOICED" }],
      timesheets: [{ hours: 10, valuePaise: 50_000, status: "APPROVED" }],
    });
    expect(pos.wipPaise).toBe(40_000);
  });
});

describe("sumFirmWip + realisationRatio", () => {
  it("sums per-engagement floors (not a firm-level floor)", () => {
    // Eng A over-invoiced (−), Eng B under-invoiced (+) — firm WIP is B only.
    expect(
      sumFirmWip([
        { timeValuePaise: 10_000, invoicedPaise: 50_000 },
        { timeValuePaise: 80_000, invoicedPaise: 20_000 },
      ]),
    ).toBe(60_000);
  });

  it("returns null realisation when no time has been valued", () => {
    expect(realisationRatio(100, 0)).toBeNull();
    expect(realisationRatio(50, 100)).toBe(0.5);
  });
});

describe("fee stage lifecycle helpers", () => {
  it("advances PENDING→BILLABLE→INVOICED→PAID only", () => {
    expect(canAdvanceFeeStage("PENDING", "BILLABLE")).toBe(true);
    expect(canAdvanceFeeStage("BILLABLE", "INVOICED")).toBe(true);
    expect(canAdvanceFeeStage("INVOICED", "PAID")).toBe(true);
    expect(canAdvanceFeeStage("PENDING", "INVOICED")).toBe(false);
    expect(canAdvanceFeeStage("PAID", "INVOICED")).toBe(false);
    expect(canAdvanceFeeStage("BILLABLE", "PENDING")).toBe(false);
  });

  it("locks financials once invoiced or paid", () => {
    expect(feeStageFinancialsLocked("PENDING")).toBe(false);
    expect(feeStageFinancialsLocked("BILLABLE")).toBe(false);
    expect(feeStageFinancialsLocked("INVOICED")).toBe(true);
    expect(feeStageFinancialsLocked("PAID")).toBe(true);
  });

  it("rounds timesheet value to integer paise", () => {
    expect(timesheetValuePaise(150_000, 1.5)).toBe(225_000);
    expect(timesheetValuePaise(100_000, 0.333)).toBe(33_300);
  });
});

describe("reviewStepIndependenceError", () => {
  const author = "u-author";
  const checker = "u-checker";
  const approver = "u-approver";

  it("refuses author self-check / self-approve on any category", () => {
    expect(
      reviewStepIndependenceError({
        kind: "CHECK",
        checkCategory: "CAT1",
        actorUserId: author,
        originatedBy: author,
        recorded: [],
      }),
    ).toMatch(/author/);
    expect(
      reviewStepIndependenceError({
        kind: "APPROVE",
        checkCategory: "CAT0",
        actorUserId: author,
        originatedBy: author,
        recorded: [],
      }),
    ).toMatch(/author/);
  });

  it("on CAT1 allows one senior to both check and approve", () => {
    expect(
      reviewStepIndependenceError({
        kind: "APPROVE",
        checkCategory: "CAT1",
        actorUserId: checker,
        originatedBy: author,
        recorded: [{ kind: "CHECK", userId: checker }],
      }),
    ).toBeNull();
  });

  it("on CAT2/CAT3 requires check ≠ approve", () => {
    expect(
      reviewStepIndependenceError({
        kind: "APPROVE",
        checkCategory: "CAT2",
        actorUserId: checker,
        originatedBy: author,
        recorded: [{ kind: "CHECK", userId: checker }],
      }),
    ).toMatch(/independent of the checker/);
    expect(
      reviewStepIndependenceError({
        kind: "CHECK",
        checkCategory: "CAT3",
        actorUserId: approver,
        originatedBy: author,
        recorded: [{ kind: "APPROVE", userId: approver }],
      }),
    ).toMatch(/independent of the approver/);
  });

  it("requires VERIFY independent of author and checker", () => {
    expect(
      reviewStepIndependenceError({
        kind: "VERIFY",
        checkCategory: "CAT3",
        actorUserId: author,
        originatedBy: author,
        recorded: [{ kind: "CHECK", userId: checker }],
      }),
    ).toMatch(/author and the checker/);
    expect(
      reviewStepIndependenceError({
        kind: "VERIFY",
        checkCategory: "CAT3",
        actorUserId: checker,
        originatedBy: author,
        recorded: [{ kind: "CHECK", userId: checker }],
      }),
    ).toMatch(/author and the checker/);
    expect(
      reviewStepIndependenceError({
        kind: "VERIFY",
        checkCategory: "CAT3",
        actorUserId: "u-verifier",
        originatedBy: author,
        recorded: [
          { kind: "CHECK", userId: checker },
          { kind: "APPROVE", userId: approver },
        ],
      }),
    ).toBeNull();
  });
});

describe("mayIssueDeliverable", () => {
  it("blocks on incomplete chain, open CRS, or unvalidated packs", () => {
    expect(
      mayIssueDeliverable({
        checkCategory: "CAT1",
        recordedKinds: ["CHECK"],
        openCrsCount: 0,
        receivedInputPackCount: 0,
      }).ok,
    ).toBe(false);
    expect(
      mayIssueDeliverable({
        checkCategory: "CAT1",
        recordedKinds: ["CHECK", "APPROVE"],
        openCrsCount: 2,
        receivedInputPackCount: 0,
      }).ok,
    ).toBe(false);
    expect(
      mayIssueDeliverable({
        checkCategory: "CAT1",
        recordedKinds: ["CHECK", "APPROVE"],
        openCrsCount: 0,
        receivedInputPackCount: 1,
      }).ok,
    ).toBe(false);
  });

  it("allows issue when the chain is complete and hold points are clear", () => {
    expect(
      mayIssueDeliverable({
        checkCategory: "CAT3",
        recordedKinds: ["CHECK", "APPROVE", "VERIFY"],
        openCrsCount: 0,
        receivedInputPackCount: 0,
      }),
    ).toEqual({ ok: true });
  });
});

describe("deliverable + variation lifecycle helpers", () => {
  it("only allows forward deliverable transitions", () => {
    expect(canTransitionDeliverable("DRAFT", "ISSUED")).toBe(true);
    expect(canTransitionDeliverable("DRAFT", "WITHDRAWN")).toBe(true);
    expect(canTransitionDeliverable("ISSUED", "DRAFT")).toBe(false);
    expect(canTransitionDeliverable("ISSUED", "SUPERSEDED")).toBe(true);
    expect(canTransitionDeliverable("WITHDRAWN", "DRAFT")).toBe(false);
  });

  it("allows raising check category but not lowering it", () => {
    expect(canRaiseCheckCategory("CAT1", "CAT3")).toBe(true);
    expect(canRaiseCheckCategory("CAT2", "CAT2")).toBe(true);
    expect(canRaiseCheckCategory("CAT3", "CAT1")).toBe(false);
  });

  it("gates variation decide/delete on status", () => {
    expect(canDecideVariation("PROPOSED")).toBe(true);
    expect(canDecideVariation("APPROVED")).toBe(false);
    expect(variationDeletionBlocked("APPROVED")).toBe(true);
    expect(variationDeletionBlocked("PROPOSED")).toBe(false);
  });
});

describe("rankPrecedentEngagements", () => {
  const pool = [
    {
      id: "e1",
      title: "Tower A structural peer review",
      consultancyType: "STRUCTURAL",
      model: "PEER_REVIEW",
      brief: { storeys: 40, seismic: "Zone III" },
      deliverableTitles: ["Foundation GA", "Core walls"],
    },
    {
      id: "e2",
      title: "Campus HVAC design assist",
      consultancyType: "HVAC",
      model: "DESIGN_ASSIST",
      brief: { tonnage: 1200 },
      deliverableTitles: ["Chiller schedule"],
    },
    {
      id: "e3",
      title: "PEB warehouse full design",
      consultancyType: "PEB",
      model: "FULL_DESIGN",
      deliverableTitles: ["Frame GA"],
    },
  ];

  it("ranks structural peer-review hits above unrelated HVAC", () => {
    const hits = rankPrecedentEngagements("structural peer review Zone III", pool);
    expect(hits[0]?.id).toBe("e1");
    expect(hits[0]!.score).toBeGreaterThan(hits.find((h) => h.id === "e2")?.score ?? 0);
  });

  it("returns empty for tiny tokens", () => {
    expect(rankPrecedentEngagements("a to", pool)).toEqual([]);
  });
});

describe("buildDeliverableLineage", () => {
  it("reports outstanding VERIFY on CAT3 and lists fee stages", () => {
    const lin = buildDeliverableLineage({
      code: "S-01",
      title: "Core walls",
      status: "DRAFT",
      checkCategory: "CAT3",
      revision: "P01",
      steps: [
        { kind: "CHECK", userName: "Asha" },
        { kind: "APPROVE", userName: "Ravi" },
      ],
      feeStages: [{ label: "IFC issue", status: "PENDING", amountPaise: 100_000 }],
    });
    expect(lin.chainComplete).toBe(false);
    expect(lin.missingSteps).toEqual(["VERIFY"]);
    expect(lin.summary).toContain("Outstanding: VERIFY");
    expect(lin.summary).toContain("IFC issue [PENDING]");
  });

  it("marks the chain complete when all steps are present", () => {
    const lin = buildDeliverableLineage({
      code: "S-01",
      title: "Core walls",
      status: "ISSUED",
      checkCategory: "CAT1",
      revision: "C01",
      steps: [
        { kind: "CHECK", userName: "Asha" },
        { kind: "APPROVE", userName: "Ravi" },
      ],
      feeStages: [],
      calcPackages: [
        { code: "CALC-01", title: "Wall design", status: "CURRENT", revision: "P02" },
      ],
    });
    expect(lin.chainComplete).toBe(true);
    expect(lin.summary).toContain("Chain complete");
    expect(lin.summary).toContain("CALC-01 rev P02 [CURRENT]");
  });
});

describe("canAdvanceCalcPackage", () => {
  it("allows DRAFT → CURRENT / SUPERSEDED and CURRENT → SUPERSEDED only", () => {
    expect(canAdvanceCalcPackage("DRAFT", "CURRENT")).toBe(true);
    expect(canAdvanceCalcPackage("DRAFT", "SUPERSEDED")).toBe(true);
    expect(canAdvanceCalcPackage("CURRENT", "SUPERSEDED")).toBe(true);
    expect(canAdvanceCalcPackage("SUPERSEDED", "CURRENT")).toBe(false);
    expect(canAdvanceCalcPackage("CURRENT", "DRAFT")).toBe(false);
  });
});

describe("buildCapacityOutlook", () => {
  const engagements = [
    { id: "e-struct", leadDiscipline: "STRUCTURAL", status: "ACTIVE" },
    { id: "e-mep", leadDiscipline: "MEP", status: "ACTIVE" },
  ];

  it("projects trailing structural load as OVER when firm capacity is thin", () => {
    // 80h structural in the last 28 days → 20h/week run-rate.
    // Firm capacity 10h/week; structural owns 100% of trailing → OVER.
    const sheets = Array.from({ length: 4 }, (_, i) => ({
      date: `2026-08-${String(10 + i * 4).padStart(2, "0")}`,
      hours: 20,
      engagementId: "e-struct",
    }));
    const rows = buildCapacityOutlook({
      asOf: "2026-09-01",
      horizonMonths: 1,
      firmCapacityHoursWeek: 10,
      sheets,
      engagements: [{ id: "e-struct", leadDiscipline: "STRUCTURAL", status: "ACTIVE" }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.discipline).toBe("STRUCTURAL");
    expect(rows[0]!.status).toBe("OVER");
    expect(rows[0]!.load!).toBeGreaterThan(1);
  });

  it("splits firm capacity by trailing discipline share", () => {
    const sheets = [
      { date: "2026-08-10", hours: 30, engagementId: "e-struct" },
      { date: "2026-08-12", hours: 10, engagementId: "e-mep" },
    ];
    const rows = buildCapacityOutlook({
      asOf: "2026-09-01",
      horizonMonths: 1,
      firmCapacityHoursWeek: 40,
      sheets,
      engagements,
    });
    const byDisc = Object.fromEntries(rows.map((r) => [r.discipline, r]));
    expect(byDisc.STRUCTURAL!.capacityHours).toBeGreaterThan(byDisc.MEP!.capacityHours);
    expect(byDisc.STRUCTURAL!.status).not.toBe("OVER");
  });

  it("returns no rows when there is no discipline signal", () => {
    expect(
      buildCapacityOutlook({
        asOf: "2026-09-01",
        firmCapacityHoursWeek: 40,
        sheets: [],
        engagements: [],
      }),
    ).toEqual([]);
  });
});

describe("capacityOutlookAlerts", () => {
  it("surfaces OVER before TIGHT and caps the list", () => {
    const alerts = capacityOutlookAlerts(
      [
        {
          month: "2026-09",
          discipline: "STRUCTURAL",
          hours: 100,
          capacityHours: 80,
          load: 1.25,
          status: "OVER",
        },
        {
          month: "2026-09",
          discipline: "MEP",
          hours: 40,
          capacityHours: 45,
          load: 0.89,
          status: "TIGHT",
        },
        {
          month: "2026-10",
          discipline: "CIVIL",
          hours: 10,
          capacityHours: 50,
          load: 0.2,
          status: "OK",
        },
      ],
      1,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(/Structural/i);
    expect(alerts[0]).toMatch(/over-committed/i);
  });
});

describe("MDR deliverable numbering", () => {
  it("builds and parses C-YY-NNN-TYPE-seq codes", () => {
    const code = buildMdrDeliverableCode({
      jobRoot: "C-26-001",
      docType: "CALCULATION",
      sequence: 1,
    });
    expect(code).toBe("C-26-001-CAL-001");
    expect(parseMdrDeliverableCode(code)).toEqual({
      jobRoot: "C-26-001",
      docTypeCode: "CAL",
      docType: "CALCULATION",
      sequence: 1,
    });
  });

  it("rejects revision/status tokens and wrong job roots", () => {
    expect(isValidMdrDeliverableCode("C-26-001-CAL-001", "C-26-001")).toBe(true);
    expect(isValidMdrDeliverableCode("C-26-001-P01-001", "C-26-001")).toBe(false);
    expect(isValidMdrDeliverableCode("C-26-001-CAL-001", "C-26-002")).toBe(false);
    expect(isValidMdrDeliverableCode("STR-CAL-001", "C-26-001")).toBe(false);
    expect(parseMdrDeliverableCode("C-26-001-CAL-P01")).toBeNull();
  });

  it("allocates the next free sequence per job + type", () => {
    expect(
      nextMdrSequence(
        ["C-26-001-CAL-001", "C-26-001-CAL-003", "C-26-001-DRW-002", "C-26-002-CAL-009"],
        "C-26-001",
        "CALCULATION",
      ),
    ).toBe(4);
    expect(nextMdrSequence([], "C-26-001", "DRAWING")).toBe(1);
  });
});
