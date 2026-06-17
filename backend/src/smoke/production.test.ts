import { describe, expect, it } from "vitest";
import { releaseSummary } from "../lib/releaseInfo.js";
import type { ReleaseInfo } from "../lib/releaseInfo.js";
import { systemRouter } from "../modules/system/router.js";
import { noopDb, testCtx, testUser } from "../test/trpcCaller.js";

function sampleRelease(checks: ReleaseInfo["checks"]): ReleaseInfo {
  return {
    app: "ESTI AORMS",
    version: "0.0.0",
    revision: "test",
    nodeEnv: "test",
    builtAt: null,
    checks,
  };
}

describe("production readiness smoke", () => {
  it("releaseSummary ok when db and redis are healthy", () => {
    const summary = releaseSummary(sampleRelease({ db: true, redis: true, storage: false }));
    expect(summary.ok).toBe(true);
    expect(summary.checks.storage).toBe(false);
  });

  it("releaseSummary not ok when db is down", () => {
    const summary = releaseSummary(sampleRelease({ db: false, redis: true, storage: true }));
    expect(summary.ok).toBe(false);
  });

  it("system.release is owner-only", async () => {
    const caller = systemRouter.createCaller(testCtx(testUser("ASSOCIATE"), noopDb));
    await expect(caller.release()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
