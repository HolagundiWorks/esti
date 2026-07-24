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

vi.mock("../../lib/numbering.js", () => ({
  nextRef: vi.fn(async () => ({ ref: "TRN-0001", seq: 1 })),
}));

vi.mock("../../lib/sync/publish.js", () => ({
  publishEntity: vi.fn(async () => undefined),
}));

vi.mock("../../lib/createInvoice.js", () => ({
  createStudioInvoice: vi.fn(async () => ({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ref: "INV-0001",
    status: "ISSUED",
    documentKind: "TAX_INVOICE",
    netReceivablePaise: 118_00,
    pdfStatus: "PENDING",
  })),
}));

import { consultancyRouter } from "./router.js";
import { createStudioInvoice } from "../../lib/createInvoice.js";

const ENG = "11111111-1111-4111-8111-111111111111";
const ENG_B = "22222222-2222-4222-8222-222222222222";
const DEL = "33333333-3333-4333-8333-333333333333";
const DEL_B = "44444444-4444-4444-8444-444444444444";
const FEE = "55555555-5555-4555-8555-555555555555";
const VAR = "66666666-6666-4666-8666-666666666666";
const SHEET = "77777777-7777-4777-8777-777777777777";
const CLIENT = "88888888-8888-4888-8888-888888888888";
const PROJ = "99999999-9999-4999-8999-999999999999";
const TRN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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
      values: (values: unknown) => {
        inserts.push({ table: name, values });
        return {
          returning: async () => {
            if (opts.insertReturning) return opts.insertReturning(name, values);
            const row = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ...(values as object) };
            return [row];
          },
          onConflictDoUpdate: () => Promise.resolve(undefined),
          then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(undefined).then(resolve, reject),
        };
      },
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
    invoiceId: null,
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
    transmittalId: null,
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
  function engagement(overrides: Record<string, unknown> = {}) {
    return {
      id: ENG,
      code: "C-26-001",
      title: "Tower structure",
      clientId: CLIENT,
      projectId: PROJ,
      model: "DESIGN",
      leadDiscipline: "STRUCTURAL",
      status: "ACTIVE",
      ...overrides,
    };
  }

  it("markInvoiced only from BILLABLE and raises a Studio invoice", async () => {
    vi.mocked(createStudioInvoice).mockClear();
    const { db } = makeDb({
      "esti_cons_fee_stage": [feeStage({ status: "PENDING" })],
      "esti_cons_engagement": [engagement()],
    });
    await expect(caller("PARTNER", db).feeStages.markInvoiced({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(createStudioInvoice).not.toHaveBeenCalled();

    const ok = makeDb({
      "esti_cons_fee_stage": [feeStage({ status: "BILLABLE" })],
      "esti_cons_engagement": [engagement()],
    });
    const row = await caller("PARTNER", ok.db).feeStages.markInvoiced({ id: FEE, dueInDays: 15 });
    expect(row.status).toBe("INVOICED");
    expect(row.invoiceId).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(createStudioInvoice).toHaveBeenCalledOnce();
    expect(ok.updates.some((u) => u.table === "esti_cons_fee_stage")).toBe(true);
  });

  it("markInvoiced refuses without a linked Studio project", async () => {
    const { db } = makeDb({
      "esti_cons_fee_stage": [feeStage({ status: "BILLABLE" })],
      "esti_cons_engagement": [engagement({ projectId: null })],
    });
    await expect(caller("PARTNER", db).feeStages.markInvoiced({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Studio project"),
    });
  });

  it("markPaid only from INVOICED and syncs linked Studio invoice", async () => {
    const INV = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const { db } = makeDb({ "esti_cons_fee_stage": [feeStage({ status: "BILLABLE" })] });
    await expect(caller("PARTNER", db).feeStages.markPaid({ id: FEE })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const ok = makeDb({
      "esti_cons_fee_stage": [feeStage({ status: "INVOICED", invoiceId: INV })],
      "esti_invoice": [
        {
          id: INV,
          status: "ISSUED",
          netReceivablePaise: 118_00,
          paidPaise: 0,
        },
      ],
    });
    const row = await caller("PARTNER", ok.db).feeStages.markPaid({ id: FEE });
    expect(row.status).toBe("PAID");
    expect(
      ok.updates.some(
        (u) =>
          u.table === "esti_invoice" && (u.set as { status?: string }).status === "PAID",
      ),
    ).toBe(true);
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

describe("consultancy MDR deliverable numbering", () => {
  it("allocates the next CAL sequence from docType", async () => {
    const { db, inserts } = makeDb({
      "esti_cons_engagement": [{ id: ENG, code: "C-26-001" }],
      "esti_cons_deliverable": [deliverable({ code: "C-26-001-CAL-001" })],
    });
    const row = await caller("SENIOR", db).deliverables.create({
      engagementId: ENG,
      docType: "CALCULATION",
      title: "Pile cap",
      discipline: "STRUCTURAL",
      revision: "P01",
      issueClass: "FOR_INFORMATION",
      checkCategory: "CAT1",
    });
    expect(row.code).toBe("C-26-001-CAL-002");
    expect(inserts.some((i) => i.table === "esti_cons_deliverable")).toBe(true);
  });

  it("rejects a free-text code that breaks the job root", async () => {
    const { db } = makeDb({
      "esti_cons_engagement": [{ id: ENG, code: "C-26-001" }],
      "esti_cons_deliverable": [],
    });
    await expect(
      caller("SENIOR", db).deliverables.create({
        engagementId: ENG,
        code: "STR-CAL-001",
        title: "Bad root",
        discipline: "STRUCTURAL",
        revision: "P01",
        issueClass: "FOR_INFORMATION",
        checkCategory: "CAT1",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("MDR") });
  });

  it("rejects a duplicate MDR code on the same engagement", async () => {
    const { db } = makeDb({
      "esti_cons_engagement": [{ id: ENG, code: "C-26-001" }],
      "esti_cons_deliverable": [deliverable({ code: "C-26-001-CAL-001" })],
    });
    await expect(
      caller("SENIOR", db).deliverables.create({
        engagementId: ENG,
        code: "C-26-001-CAL-001",
        title: "Dup",
        discipline: "STRUCTURAL",
        revision: "P01",
        issueClass: "FOR_INFORMATION",
        checkCategory: "CAT1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
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

describe("consultancy SOP — issue transmittal (MDR back-reference)", () => {
  function engagement(overrides: Record<string, unknown> = {}) {
    return {
      id: ENG,
      code: "C-26-001",
      title: "Tower structure",
      clientId: CLIENT,
      projectId: PROJ,
      model: "DESIGN",
      leadDiscipline: "STRUCTURAL",
      status: "ACTIVE",
      ...overrides,
    };
  }

  it("refuses when deliverable is not ISSUED", async () => {
    const { db } = makeDb({
      "esti_cons_deliverable": [deliverable({ status: "DRAFT" })],
      "esti_cons_engagement": [engagement()],
    });
    await expect(
      caller("ASSOCIATE", db).deliverables.recordIssueTransmittal({ deliverableId: DEL }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("issue first") });
  });

  it("refuses when engagement has no Studio project", async () => {
    const { db } = makeDb({
      "esti_cons_deliverable": [deliverable({ status: "ISSUED", issuedAt: new Date() })],
      "esti_cons_engagement": [engagement({ projectId: null })],
    });
    await expect(
      caller("ASSOCIATE", db).deliverables.recordIssueTransmittal({ deliverableId: DEL }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Studio project"),
    });
  });

  it("creates Studio TRN and links the deliverable", async () => {
    const ok = makeDb(
      {
        "esti_cons_deliverable": [deliverable({ status: "ISSUED", issuedAt: new Date() })],
        "esti_cons_engagement": [engagement()],
        "esti_client": [{ id: CLIENT, name: "Acme Developers" }],
      },
      {
        insertReturning: (table, values) => {
          if (table === "esti_transmittal") {
            return [{ id: TRN, ref: "TRN-0001", ...(values as object) }];
          }
          return [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ...(values as object) }];
        },
      },
    );
    const result = await caller("ASSOCIATE", ok.db).deliverables.recordIssueTransmittal({
      deliverableId: DEL,
    });
    expect(result.transmittal.ref).toBe("TRN-0001");
    expect(result.transmittal.purpose).toBe("FOR_CONSTRUCTION");
    expect(result.transmittal.recipient).toBe("Acme Developers");
    expect(ok.inserts.some((i) => i.table === "esti_transmittal")).toBe(true);
    expect(ok.inserts.some((i) => i.table === "esti_transmittal_item")).toBe(true);
    expect(
      ok.updates.some(
        (u) =>
          u.table === "esti_cons_deliverable" &&
          (u.set as { transmittalId?: string }).transmittalId === TRN,
      ),
    ).toBe(true);
  });
});


describe("consultancy SOP — enquiry go/no-go", () => {
  const ENQ = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  function enquiry(overrides: Record<string, unknown> = {}) {
    return {
      id: ENQ,
      ref: "EQ-26-001",
      title: "Tower peer review",
      clientName: "Acme",
      status: "RECEIVED",
      capacityFit: null,
      feeAttractiveness: null,
      risk: null,
      strategicFit: null,
      conflictCheckDone: false,
      decisionNote: null,
      convertedEngagementId: null,
      leadDiscipline: "STRUCTURAL",
      consultancyType: "STRUCTURAL",
      model: "PEER_REVIEW",
      ...overrides,
    };
  }

  it("refuses GO without a scored scorecard", async () => {
    const { db } = makeDb({
      "esti_cons_enquiry": [enquiry({ status: "UNDER_REVIEW" })],
    });
    await expect(
      caller("PARTNER", db).enquiries.decide({ id: ENQ, decision: "GO" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("scorecard") });
  });

  it("converts GO into an engagement with a job code", async () => {
    const ok = makeDb(
      {
        "esti_cons_enquiry": [
          enquiry({
            status: "GO",
            capacityFit: 4,
            feeAttractiveness: 4,
            risk: 2,
            strategicFit: 4,
            conflictCheckDone: true,
          }),
        ],
        "esti_cons_engagement": [],
      },
      {
        insertReturning: (table, values) => {
          if (table === "esti_cons_engagement") {
            return [{ id: ENG, code: "C-26-001", ...(values as object) }];
          }
          return [{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", ...(values as object) }];
        },
      },
    );
    const result = await caller("PARTNER", ok.db).enquiries.convertToEngagement({ id: ENQ });
    expect(result.engagement.code).toMatch(/^C-\d{2}-\d{3}$/);
    expect(result.enquiry.status).toBe("WON");
    expect(result.enquiry.convertedEngagementId).toBe(ENG);
    expect(ok.inserts.some((i) => i.table === "esti_cons_engagement")).toBe(true);
  });
});

describe("consultancy SOP — closeout registers", () => {
  const LESSON = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const NC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  it("refuses APPROVED contract review until the checklist is complete", async () => {
    const { db } = makeDb({});
    await expect(
      caller("PARTNER", db).contractReviews.create({
        engagementId: ENG,
        reviewDate: "2026-07-21",
        requirementsDefined: true,
        capabilityConfirmed: true,
        conflictChecked: true,
        proposalVsContractOk: false,
        decision: "APPROVED",
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Proposal-vs-contract"),
    });
  });

  it("records an APPROVED contract review when all boxes are set", async () => {
    const { inserts, db } = makeDb({});
    const row = await caller("PARTNER", db).contractReviews.create({
      engagementId: ENG,
      reviewDate: "2026-07-21",
      requirementsDefined: true,
      capabilityConfirmed: true,
      conflictChecked: true,
      proposalVsContractOk: true,
      decision: "APPROVED",
    });
    expect(row.decision).toBe("APPROVED");
    expect(inserts.some((i) => i.table === "esti_cons_contract_review")).toBe(true);
  });

  it("publishes a draft lesson", async () => {
    const { db, updates } = makeDb({
      "esti_cons_lesson": [
        {
          id: LESSON,
          engagementId: ENG,
          category: "GENERAL",
          title: "Late input packs",
          body: "Hold issue until validated.",
          status: "DRAFT",
          authorName: "A",
        },
      ],
    });
    const row = await caller("PARTNER", db).lessons.publish({ id: LESSON });
    expect(row.status).toBe("PUBLISHED");
    expect(updates.some((u) => u.table === "esti_cons_lesson")).toBe(true);
  });

  it("closes an NC with CAPA and refuses deleting closed NCs", async () => {
    const open = makeDb({
      "esti_cons_nc": [
        {
          id: NC,
          engagementId: ENG,
          code: "NC-001",
          title: "Missing cover",
          severity: "MINOR",
          status: "OPEN",
          correctiveAction: null,
          preventiveAction: null,
        },
      ],
    });
    const closed = await caller("PARTNER", open.db).ncs.close({
      id: NC,
      correctiveAction: "Add cover sheet",
      preventiveAction: "Template check",
    });
    expect(closed.status).toBe("CLOSED");

    const locked = makeDb({
      "esti_cons_nc": [
        {
          id: NC,
          engagementId: ENG,
          code: "NC-001",
          title: "Missing cover",
          severity: "MINOR",
          status: "CLOSED",
        },
      ],
    });
    await expect(caller("PARTNER", locked.db).ncs.remove({ id: NC })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Closed NCs"),
    });
  });

  it("issues a MoM and refuses deleting issued minutes", async () => {
    const draft = makeDb({
      "esti_cons_mom": [
        {
          id: LESSON,
          engagementId: ENG,
          ref: "MOM-001",
          title: "Kickoff",
          meetingDate: "2026-07-21",
          status: "DRAFT",
          authorName: "A",
        },
      ],
    });
    const issued = await caller("PARTNER", draft.db).moms.issue({ id: LESSON });
    expect(issued.status).toBe("ISSUED");

    const locked = makeDb({
      "esti_cons_mom": [
        {
          id: LESSON,
          engagementId: ENG,
          ref: "MOM-001",
          title: "Kickoff",
          meetingDate: "2026-07-21",
          status: "ISSUED",
          authorName: "A",
        },
      ],
    });
    await expect(caller("PARTNER", locked.db).moms.remove({ id: LESSON })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Issued MoMs"),
    });
  });
});

describe("consultancy pre-con — opportunity + phase gate", () => {
  it("creates an opportunity on the engagement", async () => {
    const { inserts, db } = makeDb({});
    const row = await caller("PARTNER", db).opportunities.create({
      engagementId: ENG,
      title: "Prefabricate connection details",
      area: "BUILDABILITY",
      source: "DESIGN_REVIEW",
      probability: 4,
      impact: 4,
      response: "ENHANCE",
    });
    expect(row.title).toContain("Prefabricate");
    expect(inserts.some((i) => i.table === "esti_cons_opportunity")).toBe(true);
  });

  it("refuses GO on a phase gate with an incomplete checklist", async () => {
    const { db } = makeDb({});
    await expect(
      caller("PARTNER", db).phaseGates.upsert({
        engagementId: ENG,
        gateKey: "CONCEPT",
        checklist: { scopeDefined: true },
        decision: "GO",
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("GO blocked"),
    });
  });
});
