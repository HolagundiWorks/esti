/**
 * P9.V — consultancy money / sign-off mutation wiring.
 *
 * Pure helpers live in @esti/contracts (unit-tested there). These tests prove
 * the router actually enforces them: fee advances, financial locks, issue→BILLABLE
 * fire, variation approve race, timesheet rate gate, portal/money scoping.
 *
 * Stubbed Drizzle (no Postgres in CI) — same pattern as authorization.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { Context } from "../../trpc/context.js";
import { testCtx, testUser } from "../../test/trpcCaller.js";

vi.mock("../../lib/plan.js", () => ({
  firmPlan: vi.fn(async () => "PRO"),
  licenseBlocked: vi.fn(async () => false),
}));

vi.mock("../../lib/audit.js", () => ({
  writeAudit: vi.fn(async () => undefined),
}));

import { consultancyRouter } from "./router.js";

const ENG = "11111111-1111-4111-8111-111111111111";
const ENG_B = "22222222-2222-4222-8222-222222222222";
const DEL = "33333333-3333-4333-8333-333333333333";
const DEL_B = "44444444-4444-4444-8444-444444444444";
const FEE = "55555555-5555-4555-8555-555555555555";
const VAR = "66666666-6666-4666-8666-666666666666";
const SHEET = "77777777-7777-4777-8777-777777777777";
/** Matches `testUser()` default id — used as originatedBy / timesheet owner. */
const ACTOR = "00000000-0000-0000-0000-000000000001";

type RowsByTable = Record<string, unknown[]>;

/** Chainable thenable that resolves to `rows` after any where/orderBy/limit. */
function thenableRows(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const chain: {
    where: () => typeof chain;
    orderBy: () => typeof chain;
    limit: () => typeof chain;
    then: typeof p.then;
    catch: typeof p.catch;
  } = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  };
  return chain;
}

function tableName(table: unknown): string {
  try {
    return getTableName(table as Parameters<typeof getTableName>[0]);
  } catch {
    return "unknown";
  }
}

type StubOpts = {
  /** Override update().returning() — used for race claims (return []). */
  updateReturning?: (table: string, set: unknown) => unknown[];
  /** Override insert().returning(). */
  insertReturning?: (table: string, values: unknown) => unknown[];
};

function makeDb(tables: RowsByTable, opts: StubOpts = {}) {
  const updates: Array<{ table: string; set: unknown }> = [];
  const inserts: Array<{ table: string; values: unknown }> = [];
  const deletes: string[] = [];

  const api: Record<string, unknown> = {};

  api.select = () => ({
    from: (table: unknown) => thenableRows(tables[tableName(table)] ?? []),
  });

  api.update = (table: unknown) => {
    const name = tableName(table);
    return {
      set: (set: unknown) => {
        const whereResult = {
          returning: async () => {
            updates.push({ table: name, set });
            if (opts.updateReturning) return opts.updateReturning(name, set);
            const base = (tables[name]?.[0] as Record<string, unknown>) ?? {};
            const merged = { ...base, ...(set as object) };
            if (tables[name]?.[0]) tables[name][0] = merged;
            return [merged];
          },
        };
        // Support `await db.update().set().where()` without .returning()
        return {
          where: () => ({
            ...whereResult,
            then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
              Promise.resolve(undefined).then(resolve, reject),
          }),
        };
      },
    };
  };

  api.insert = (table: unknown) => {
    const name = tableName(table);
    return {
      values: (values: unknown) => ({
        returning: async () => {
          inserts.push({ table: name, values });
          if (opts.insertReturning) return opts.insertReturning(name, values);
          const row = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ...(values as object) };
          return [row];
        },
        onConflictDoUpdate: () => Promise.resolve(undefined),
      }),
    };
  };

  api.delete = (table: unknown) => {
    const name = tableName(table);
    return {
      where: () => {
        deletes.push(name);
        return Promise.resolve(undefined);
      },
    };
  };

  api.transaction = async (fn: (tx: typeof api) => Promise<unknown>) => fn(api);

  return { db: api as unknown as Context["db"], updates, inserts, deletes };
}

function caller(role: Parameters<typeof testUser>[0], db: Context["db"], overrides = {}) {
  return consultancyRouter.createCaller(testCtx(testUser(role, overrides), db));
}

function feeStage(overrides: Record<string, unknown> = {}) {
  return {
    id: FEE,
    engagementId: ENG,
    label: "Concept fee",
    amountPaise: 100_00,
    deliverableId: DEL,
    status: "BILLABLE",
    billableAt: new Date(),
    invoicedAt: null,
    invoiceDue: null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function deliverable(overrides: Record<string, unknown> = {}) {
  return {
    id: DEL,
    engagementId: ENG,
    code: "C-26-001-CAL-001",
    title: "Foundation calc",
    discipline: "STRUCTURAL",
    revision: "P01",
    issueClass: "FOR_CONSTRUCTION",
    checkCategory: "CAT1",
    status: "DRAFT",
    issuedAt: null,
    originatedBy: ACTOR,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function variation(overrides: Record<string, unknown> = {}) {
  return {
    id: VAR,
    engagementId: ENG,
    code: "VO-01",
    title: "Extra storey analysis",
    amountPaise: 50_00,
    status: "PROPOSED",
    feeStageId: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("consultancy P9.V — fee stage advances + locks", () => {
  it("markInvoiced only from BILLABLE", async () => {
    const { db } = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "PENDING" })] });
    await expect(caller("PARTNER", db).feeStages.markInvoiced({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const ok = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "BILLABLE" })] });
    const row = await caller("PARTNER", ok.db).feeStages.markInvoiced({ id: FEE, dueInDays: 15 });
    expect(row.status).toBe("INVOICED");
    expect(ok.updates).toHaveLength(1);
  });

  it("markPaid only from INVOICED", async () => {
    const { db } = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "BILLABLE" })] });
    await expect(caller("PARTNER", db).feeStages.markPaid({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const ok = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "INVOICED" })] });
    const row = await caller("PARTNER", ok.db).feeStages.markPaid({ id: FEE });
    expect(row.status).toBe("PAID");
  });

  it("refuses amount edits and deletes once INVOICED/PAID", async () => {
    const locked = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "INVOICED" })] });
    await expect(
      caller("PARTNER", locked.db).feeStages.update({ id: FEE, amountPaise: 200_00 }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(caller("PARTNER", locked.db).feeStages.remove({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    // Label-only edit stays allowed on a locked stage.
    const labelOk = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "PAID" })] });
    const row = await caller("PARTNER", labelOk.db).feeStages.update({
      id: FEE,
      label: "Paid concept fee",
    });
    expect(row.label).toBe("Paid concept fee");
  });

  it("blocks linking a deliverable from another engagement", async () => {
    const { db } = makeDb({
      "esti_cons_fee_stage": [feeStage({ status: "PENDING", deliverableId: null })],
      "esti_cons_deliverable": [{ engagementId: ENG_B, id: DEL_B }],
    });
    await expect(
      caller("PARTNER", db).feeStages.update({ id: FEE, deliverableId: DEL_B }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("consultancy P9.V — issue gate + BILLABLE fire", () => {
  it("refuses ISSUED when the sign-off chain is incomplete", async () => {
    const { db, updates } = makeDb({
      "esti_cons_deliverable": [deliverable()],
      "esti_cons_review_step": [], // missing CHECK + APPROVE
      "esti_cons_review_comment": [],
      "esti_cons_input_pack": [],
    });
    await expect(
      caller("SENIOR", db).deliverables.update({ id: DEL, status: "ISSUED" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("sign-off") });
    expect(updates).toHaveLength(0);
  });

  it("refuses ISSUED when CRS comments are still OPEN", async () => {
    const { db, updates } = makeDb({
      "esti_cons_deliverable": [deliverable()],
      "esti_cons_review_step": [
        { kind: "CHECK", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        { kind: "APPROVE", userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      ],
      "esti_cons_review_comment": [{ reviewer: "Ravi", status: "OPEN" }],
      "esti_cons_input_pack": [],
    });
    await expect(
      caller("SENIOR", db).deliverables.update({ id: DEL, status: "ISSUED" }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("review comment"),
    });
    expect(updates).toHaveLength(0);
  });

  it("refuses ISSUED when an input pack is still RECEIVED", async () => {
    const { db, updates } = makeDb({
      "esti_cons_deliverable": [deliverable()],
      "esti_cons_review_step": [
        { kind: "CHECK", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        { kind: "APPROVE", userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      ],
      "esti_cons_review_comment": [],
      "esti_cons_input_pack": [{ title: "Geotech draft", status: "RECEIVED", engagementId: ENG }],
    });
    await expect(
      caller("SENIOR", db).deliverables.update({ id: DEL, status: "ISSUED" }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("input pack"),
    });
    expect(updates).toHaveLength(0);
  });

  it("issues and flips linked PENDING fee stages to BILLABLE", async () => {
    const { db, updates } = makeDb({
      "esti_cons_deliverable": [deliverable()],
      "esti_cons_review_step": [
        { kind: "CHECK", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        { kind: "APPROVE", userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      ],
      "esti_cons_review_comment": [],
      "esti_cons_input_pack": [],
      "esti_cons_fee_stage": [feeStage({ status: "PENDING" })],
    });
    const row = await caller("SENIOR", db).deliverables.update({ id: DEL, status: "ISSUED" });
    expect(row.status).toBe("ISSUED");
    // Deliverable update + fee-stage BILLABLE fire
    expect(updates.some((u) => u.table === "esti_cons_deliverable")).toBe(true);
    expect(
      updates.some(
        (u) =>
          u.table === "esti_cons_fee_stage" &&
          (u.set as { status?: string }).status === "BILLABLE",
      ),
    ).toBe(true);
  });

  it("blocks body edits on issued content", async () => {
    const { db } = makeDb({
      "esti_cons_deliverable": [deliverable({ status: "ISSUED" })],
    });
    await expect(
      caller("SENIOR", db).deliverables.update({ id: DEL, title: "Rewritten title" }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("immutable"),
    });
  });
});

describe("consultancy P9.V — variations", () => {
  it("approve appends a BILLABLE fee stage", async () => {
    const stageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const { db, inserts, updates } = makeDb(
      { "esti_cons_variation": [variation()] },
      {
        insertReturning: (table, values) => {
          if (table === "esti_cons_fee_stage") {
            return [{ id: stageId, ...(values as object), status: "BILLABLE" }];
          }
          return [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ...(values as object) }];
        },
      },
    );
    const row = await caller("PARTNER", db).variations.approve({ id: VAR });
    expect(row.status).toBe("APPROVED");
    expect(row.feeStageId).toBe(stageId);
    expect(inserts.some((i) => i.table === "esti_cons_fee_stage")).toBe(true);
    expect(updates.some((u) => u.table === "esti_cons_variation")).toBe(true);
  });

  it("second approve loses the race (already decided)", async () => {
    const { db } = makeDb(
      { "esti_cons_variation": [variation({ status: "APPROVED" })] },
      { updateReturning: () => [] }, // conditional WHERE status=PROPOSED claims nothing
    );
    await expect(caller("PARTNER", db).variations.approve({ id: VAR })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("already"),
    });
  });

  it("reject only while PROPOSED; delete blocked when APPROVED", async () => {
    const rej = makeDb({ "esti_cons_variation": [variation({ status: "APPROVED" })] });
    await expect(caller("SENIOR", rej.db).variations.reject({ id: VAR })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const delBlocked = makeDb({ "esti_cons_variation": [variation({ status: "APPROVED" })] });
    await expect(
      caller("PARTNER", delBlocked.db).variations.remove({ id: VAR }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    const delOk = makeDb({ "esti_cons_variation": [variation({ status: "REJECTED" })] });
    await expect(caller("PARTNER", delOk.db).variations.remove({ id: VAR })).resolves.toEqual({
      ok: true,
    });
    expect(delOk.deletes).toContain("esti_cons_variation");
  });
});

describe("consultancy P9.V — timesheets", () => {
  it("log requires a rate card and snapshots valuePaise", async () => {
    const noRate = makeDb({ "esti_cons_rate_card": [] });
    await expect(
      caller("ASSOCIATE", noRate.db).timesheets.log({
        engagementId: ENG,
        date: "2026-07-21",
        grade: "ENGINEER",
        hours: 4,
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("rate card") });

    const { db, inserts } = makeDb({
      "esti_cons_rate_card": [{ grade: "ENGINEER", ratePaise: 250_00, capacityHoursWeek: 40 }],
    });
    const row = await caller("ASSOCIATE", db).timesheets.log({
      engagementId: ENG,
      date: "2026-07-21",
      grade: "ENGINEER",
      hours: 4,
    });
    // 25000 paise/hr × 4h = 100000
    expect(row.valuePaise).toBe(100_000);
    expect(inserts[0]?.table).toBe("esti_cons_timesheet");
  });

  it("blocks deleting an APPROVED entry", async () => {
    const { db } = makeDb({
      "esti_cons_timesheet": [
        {
          id: SHEET,
          engagementId: ENG,
          status: "APPROVED",
          userId: ACTOR,
          valuePaise: 10_000,
          hours: 1,
        },
      ],
    });
    await expect(caller("SENIOR", db).timesheets.remove({ id: SHEET })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("approved"),
    });
  });

  it("redacts valuePaise for non-finance roles on list", async () => {
    const rows = [
      {
        id: SHEET,
        engagementId: ENG,
        hours: 2,
        valuePaise: 50_000,
        date: "2026-07-21",
        grade: "ENGINEER",
      },
    ];
    const { db } = makeDb({ "esti_cons_timesheet": rows });
    const associate = await caller("ASSOCIATE", db).timesheets.listByEngagement({
      engagementId: ENG,
    });
    expect(associate[0]?.valuePaise).toBeNull();

    const partner = await caller("PARTNER", db).timesheets.listByEngagement({
      engagementId: ENG,
    });
    expect(partner[0]?.valuePaise).toBe(50_000);
  });
});

describe("consultancy P9.V — review-step independence", () => {
  it("refuses author self-check and duplicate kinds; allows independent CHECK", async () => {
    const authored = makeDb({
      "esti_cons_deliverable": [deliverable({ originatedBy: ACTOR, status: "DRAFT" })],
      "esti_cons_review_step": [],
    });
    await expect(
      caller("SENIOR", authored.db).reviews.record({ deliverableId: DEL, kind: "CHECK" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("author"),
    });

    const otherAuthor = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const dup = makeDb({
      "esti_cons_deliverable": [deliverable({ originatedBy: otherAuthor, status: "DRAFT" })],
      "esti_cons_review_step": [{ kind: "CHECK", userId: ACTOR }],
    });
    await expect(
      caller("SENIOR", dup.db).reviews.record({ deliverableId: DEL, kind: "CHECK" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const ok = makeDb({
      "esti_cons_deliverable": [deliverable({ originatedBy: otherAuthor, status: "DRAFT" })],
      "esti_cons_review_step": [],
    });
    const row = await caller("SENIOR", ok.db).reviews.record({
      deliverableId: DEL,
      kind: "CHECK",
    });
    expect(row.kind).toBe("CHECK");
    expect(row.userId).toBe(ACTOR);
    expect(ok.inserts.some((i) => i.table === "esti_cons_review_step")).toBe(true);
  });

  it("refuses sign-off on already-issued deliverables", async () => {
    const { db } = makeDb({
      "esti_cons_deliverable": [deliverable({ status: "ISSUED", originatedBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })],
      "esti_cons_review_step": [],
    });
    await expect(
      caller("SENIOR", db).reviews.record({ deliverableId: DEL, kind: "APPROVE" }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("drafts"),
    });
  });
});

describe("consultancy P9.V — portal / capability scoping", () => {
  it("rejects CLIENT and scoped CONSULTANT from fee mutations", async () => {
    const { db } = makeDb({ "esti_cons_fee_stage": [feeStage()] });
    await expect(
      caller("CLIENT", db, { clientId: "99999999-9999-4999-8999-999999999999" }).feeStages.markInvoiced({
        id: FEE,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("CONSULTANT", db, {
        consultantId: "99999999-9999-4999-8999-999999999998",
      }).feeStages.markPaid({ id: FEE }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ASSOCIATE cannot mark fees (fees:manage is L2+)", async () => {
    const { db } = makeDb({ "esti_cons_fee_stage": [feeStage()] });
    await expect(caller("ASSOCIATE", db).feeStages.markInvoiced({ id: FEE })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

const CALC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function calcPackage(overrides: Record<string, unknown> = {}) {
  return {
    id: CALC,
    engagementId: ENG,
    deliverableId: DEL,
    inputPackId: null,
    code: "CALC-01",
    title: "Core wall design",
    revision: "P01",
    status: "DRAFT",
    softwareTool: "ETABS",
    codeRefs: "IS 456",
    assumptions: "Zone III",
    inputsSummary: null,
    outputsSummary: null,
    preparedBy: ACTOR,
    preparedByName: "Test User",
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("consultancy P9.4 — calc package lineage", () => {
  it("setStatus refuses illegal advances (SUPERSEDED → CURRENT)", async () => {
    const { db } = makeDb({
      "esti_cons_calc_package": [calcPackage({ status: "SUPERSEDED" })],
    });
    await expect(
      caller("ASSOCIATE", db).calcPackages.setStatus({ id: CALC, status: "CURRENT" }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("SUPERSEDED"),
    });
  });

  it("DRAFT → CURRENT records the advance", async () => {
    const ok = makeDb({ "esti_cons_calc_package": [calcPackage({ status: "DRAFT" })] });
    const row = await caller("ASSOCIATE", ok.db).calcPackages.setStatus({
      id: CALC,
      status: "CURRENT",
    });
    expect(row.status).toBe("CURRENT");
    expect(ok.updates.some((u) => u.table === "esti_cons_calc_package")).toBe(true);
  });

  it("refuses deleting a CURRENT package", async () => {
    const { db } = makeDb({
      "esti_cons_calc_package": [calcPackage({ status: "CURRENT" })],
    });
    await expect(caller("ASSOCIATE", db).calcPackages.remove({ id: CALC })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("CURRENT"),
    });
  });

  it("deletes a DRAFT package", async () => {
    const ok = makeDb({ "esti_cons_calc_package": [calcPackage({ status: "DRAFT" })] });
    await expect(caller("ASSOCIATE", ok.db).calcPackages.remove({ id: CALC })).resolves.toEqual({
      ok: true,
    });
    expect(ok.deletes).toContain("esti_cons_calc_package");
  });
});
