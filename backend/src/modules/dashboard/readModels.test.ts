import { describe, expect, it } from "vitest";
import { dashboardModuleFlags } from "./readModels.js";

describe("dashboardModuleFlags", () => {
  it("defaults both modules to enabled", () => {
    expect(dashboardModuleFlags({})).toEqual({
      financialEnabled: true,
      projectEnabled: true,
    });
  });

  it("treats explicit false as disabled", () => {
    expect(
      dashboardModuleFlags({ financialEnabled: false, projectEnabled: false }),
    ).toEqual({
      financialEnabled: false,
      projectEnabled: false,
    });
  });

  it("treats null the same as enabled", () => {
    expect(
      dashboardModuleFlags({ financialEnabled: null, projectEnabled: null }),
    ).toEqual({
      financialEnabled: true,
      projectEnabled: true,
    });
  });
});
