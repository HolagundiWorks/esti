import { describe, expect, it } from "vitest";
import { searchCapsForRole } from "./query.js";

describe("search permissions", () => {
  it("gates financial hits by role", () => {
    expect(searchCapsForRole("VIEWER").financials).toBe(false);
    expect(searchCapsForRole("VIEWER").fees).toBe(false);
    expect(searchCapsForRole("ASSOCIATE").financials).toBe(false);
    // Financial search rides invoice:manage — partner and above (b6ad4c46).
    expect(searchCapsForRole("SENIOR").financials).toBe(false);
    expect(searchCapsForRole("PARTNER").financials).toBe(true);
    expect(searchCapsForRole("PARTNER").fees).toBe(true);
  });

  it("allows archived project search only for partners+", () => {
    expect(searchCapsForRole("SENIOR").archived).toBe(false);
    expect(searchCapsForRole("PARTNER").archived).toBe(true);
  });
});
