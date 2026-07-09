import { describe, expect, it } from "vitest";
import { greetingGivenName, resolveNamePrefix } from "./account-profile.js";

describe("resolveNamePrefix", () => {
  it("uses explicit prefix when set", () => {
    expect(resolveNamePrefix({ namePrefix: "Er.", coaRegistrationNo: "CA/123" })).toBe("Er.");
  });

  it("defaults to Ar. when COA is on file and prefix is unset", () => {
    expect(resolveNamePrefix({ coaRegistrationNo: "CA/123" })).toBe("Ar.");
  });

  it("returns empty when neither prefix nor COA", () => {
    expect(resolveNamePrefix({})).toBe("");
  });
});

describe("greetingGivenName", () => {
  it("prefixes first name when COA is present", () => {
    expect(greetingGivenName("Vihaan Sharma", { coaRegistrationNo: "CA/1" })).toBe("Ar. Vihaan");
  });

  it("uses first name only without COA or prefix", () => {
    expect(greetingGivenName("Vihaan Sharma", {})).toBe("Vihaan");
  });
});
