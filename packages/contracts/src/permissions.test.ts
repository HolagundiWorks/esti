import { describe, expect, it } from "vitest";
import {
  ACCESS_LEVEL_LABEL,
  accessLabelForUser,
  accessLevelForRole,
  can,
  externalClassForUser,
  minLevelForCapability,
} from "./permissions.js";

describe("access levels", () => {
  it("maps staff roles to L1–L5", () => {
    expect(accessLevelForRole("OWNER")).toBe(5);
    expect(accessLevelForRole("PARTNER")).toBe(4);
    expect(accessLevelForRole("SENIOR")).toBe(3);
    expect(accessLevelForRole("ASSOCIATE")).toBe(2);
    expect(accessLevelForRole("VIEWER")).toBe(1);
    expect(accessLevelForRole("CONSULTANT")).toBe(2);
  });

  it("returns null for portal roles", () => {
    expect(accessLevelForRole("CLIENT", { clientId: "c1" })).toBeNull();
    expect(
      accessLevelForRole("CONSULTANT", { consultantId: "x" }),
    ).toBeNull();
  });

  it("classifies external users", () => {
    expect(
      externalClassForUser({ role: "CLIENT", clientId: "c1" }),
    ).toBe("CLIENT");
    expect(
      externalClassForUser({ role: "CONSULTANT", consultantId: "x" }),
    ).toBe("CONSULTANT");
    expect(externalClassForUser({ role: "ASSOCIATE" })).toBeNull();
  });

  it("labels users for admin UI", () => {
    expect(accessLabelForUser({ role: "PARTNER" })).toBe(ACCESS_LEVEL_LABEL[4]);
    expect(
      accessLabelForUser({ role: "CLIENT", clientId: "c1" }),
    ).toBe("External — Client");
    expect(
      accessLabelForUser({ role: "CONSULTANT", consultantId: "x" }),
    ).toBe("External — Consultant");
  });

  it("aligns minLevelForCapability with can()", () => {
    const caps = [
      "workspace:view",
      "write",
      "invoice:manage",
      "fees:manage",
      "firm:admin",
    ] as const;
    for (const cap of caps) {
      const min = minLevelForCapability(cap);
      expect(can("VIEWER", cap)).toBe(min <= 1);
      expect(can("ASSOCIATE", cap)).toBe(min <= 2);
      expect(can("SENIOR", cap)).toBe(min <= 3);
      expect(can("PARTNER", cap)).toBe(min <= 4);
      expect(can("OWNER", cap)).toBe(min <= 5);
    }
  });
});
