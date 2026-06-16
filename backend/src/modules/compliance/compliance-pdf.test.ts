import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteAssessmentRouter } from "../rie/router.js";
import { specRouter } from "../spec/router.js";
import { testCtx, testUser } from "../../test/trpcCaller.js";

const assessmentId = "00000000-0000-0000-0000-000000000011";
const specSheetId = "00000000-0000-0000-0000-000000000012";

vi.mock("../../lib/redis.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue("1781577237609-0"),
}));

vi.mock("../../lib/firm.js", () => ({
  firmPayload: vi.fn().mockResolvedValue({
    legalName: "HCW Architects",
    addressLines: ["Bengaluru"],
    email: "hi@hcw.in",
    phone: "",
    gstin: "",
    pan: "",
    coaRegNo: "CA/1",
    logoKey: null,
  }),
}));

vi.mock("../../lib/audit.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

function mockDb(rows: Record<string, unknown>[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as never;
}

describe("compliance PDF enqueue smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues render_pdf for a site assessment", async () => {
    const { enqueueJob } = await import("../../lib/redis.js");
    const caller = siteAssessmentRouter.createCaller(
      testCtx(testUser("ASSOCIATE"), mockDb([{ id: assessmentId, pdfStatus: "NONE" }])),
    );

    await expect(caller.generatePdf({ id: assessmentId })).resolves.toEqual({ ok: true });
    expect(enqueueJob).toHaveBeenCalledWith(
      "render_pdf",
      expect.objectContaining({ target: "compliance", id: assessmentId }),
      "test-request",
    );
  });

  it("queues render_pdf for a specification sheet", async () => {
    const { enqueueJob } = await import("../../lib/redis.js");
    const caller = specRouter.createCaller(
      testCtx(testUser("ASSOCIATE"), mockDb([{ id: specSheetId, pdfStatus: "NONE" }])),
    );

    await expect(caller.generatePdf({ id: specSheetId })).resolves.toEqual({ ok: true });
    expect(enqueueJob).toHaveBeenCalledWith(
      "render_pdf",
      expect.objectContaining({ target: "specsheet", id: specSheetId }),
      "test-request",
    );
  });

  it("blocks viewers from requesting PDF generation", async () => {
    const caller = siteAssessmentRouter.createCaller(
      testCtx(testUser("VIEWER"), mockDb([{ id: assessmentId, pdfStatus: "NONE" }])),
    );
    await expect(caller.generatePdf({ id: assessmentId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
