import { describe, expect, it } from "vitest";
import { bbmpRulesRouter } from "../bylaw/bbmpRules.js";
import { bylawCalcRouter } from "../bylaw/calc.js";
import { ruleVersionRouter, siteAssessmentRouter } from "../rie/router.js";
import { noopDb, testCtx, testUser } from "../../test/trpcCaller.js";

const projectId = "00000000-0000-0000-0000-000000000010";
const assessmentId = "00000000-0000-0000-0000-000000000011";

function rieCaller(role: Parameters<typeof testUser>[0], overrides: Parameters<typeof testUser>[1] = {}) {
  const user = testUser(role, overrides);
  return {
    ruleVersions: ruleVersionRouter.createCaller(testCtx(user, noopDb)),
    siteAssessments: siteAssessmentRouter.createCaller(testCtx(user, noopDb)),
  };
}

function bylawCaller(role: Parameters<typeof testUser>[0], overrides: Parameters<typeof testUser>[1] = {}) {
  const user = testUser(role, overrides);
  return {
    bylawCalc: bylawCalcRouter.createCaller(testCtx(user, noopDb)),
    bbmpRules: bbmpRulesRouter.createCaller(testCtx(user, noopDb)),
  };
}

describe("RIE / BBMP tRPC authorization", () => {
  it("requires authentication on compliance reads", async () => {
    const anonRule = ruleVersionRouter.createCaller(testCtx(null, noopDb));
    const anonSite = siteAssessmentRouter.createCaller(testCtx(null, noopDb));
    const anonBylaw = bylawCalcRouter.createCaller(testCtx(null, noopDb));
    const anonBbmp = bbmpRulesRouter.createCaller(testCtx(null, noopDb));

    await expect(anonRule.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonSite.listByProject({ projectId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonBylaw.getByProject({ projectId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonBbmp.listRuleSets()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(["CLIENT", "CONSULTANT"] as const)(
    "blocks portal %s accounts from staff compliance procedures",
    async (role) => {
      const scoped =
        role === "CLIENT"
          ? { clientId: "00000000-0000-0000-0000-000000000002" }
          : { consultantId: "00000000-0000-0000-0000-000000000003" };
      const rie = rieCaller(role, scoped);
      const bylaw = bylawCaller(role, scoped);

      await expect(rie.ruleVersions.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(rie.siteAssessments.listByProject({ projectId })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(bylaw.bylawCalc.getByProject({ projectId })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(bylaw.bbmpRules.listRuleSets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("keeps Viewer read-only on compliance mutations", async () => {
    const rie = rieCaller("VIEWER");
    const bylaw = bylawCaller("VIEWER");

    await expect(
      rie.siteAssessments.run({
        projectId,
        ruleVersionId: "00000000-0000-0000-0000-000000000020",
        siteInputs: { buildingUse: "RESIDENTIAL", siteAreaSqm: 200, proposedHeightM: 9 },
      } as never),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(rie.siteAssessments.generatePdf({ id: assessmentId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rie.siteAssessments.setRelaxations({ id: assessmentId, relaxations: {} } as never)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(rie.siteAssessments.issue({ id: assessmentId })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      bylaw.bylawCalc.save({ projectId, input: {} } as never),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      bylaw.bylawCalc.savePostConstruction({ projectId, actuals: {} } as never),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows operational staff to request compliance PDF generation", async () => {
    const rie = rieCaller("ASSOCIATE");
    await expect(rie.siteAssessments.generatePdf({ id: assessmentId })).rejects.not.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it.each(["PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"] as const)(
    "limits rule-version administration to the owner (%s blocked)",
    async (role) => {
      const rie = rieCaller(role);
      await expect(rie.ruleVersions.create({} as never)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(rie.ruleVersions.publish({ id: "00000000-0000-0000-0000-000000000020" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    },
  );

  it.each(["PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"] as const)(
    "limits BBMP rule-set administration to the owner (%s blocked)",
    async (role) => {
      const bylaw = bylawCaller(role);
      await expect(bylaw.bbmpRules.createRuleSet({} as never)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        bylaw.bbmpRules.publishRuleSet({ id: "00000000-0000-0000-0000-000000000020" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("allows the owner to reach rule-version mutations (before validation/db)", async () => {
    const rie = rieCaller("OWNER");
    await expect(rie.ruleVersions.create({} as never)).rejects.not.toMatchObject({ code: "FORBIDDEN" });
    await expect(rie.ruleVersions.publish({ id: "00000000-0000-0000-0000-000000000020" })).rejects.not.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
