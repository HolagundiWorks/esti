import { describe, expect, it } from "vitest";
import { Jurisdiction, ProjectOfficeCreate, ProjectType } from "./schemas.js";
import { LeadConvert } from "./lead.js";

// Regression guard for the "RESIDENTIAL" class of bug: a short code / free-text
// value reaching a project write path where the contract expects the long-label
// ProjectType enum. Every create/convert path must reject junk and accept the
// canonical labels — and the value the create form defaults to must be valid.

describe("ProjectType enum guards project writes", () => {
  it("rejects the legacy short code and other non-members", () => {
    expect(ProjectType.safeParse("RESIDENTIAL").success).toBe(false);
    expect(ProjectType.safeParse("villa").success).toBe(false);
    expect(ProjectType.safeParse("").success).toBe(false);
  });

  it("accepts every canonical label", () => {
    for (const t of ProjectType.options) {
      expect(ProjectType.safeParse(t).success).toBe(true);
    }
  });

  it("the create form's default (ProjectType.options[0]) is a valid member", () => {
    expect(ProjectType.options[0]).toBe("Residential Architecture");
    expect(ProjectType.safeParse(ProjectType.options[0]).success).toBe(true);
  });
});

describe("ProjectOfficeCreate validates projectType", () => {
  const base = { title: "Test project", projectType: "Residential Architecture" };

  it("accepts a valid projectType", () => {
    expect(ProjectOfficeCreate.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid projectType", () => {
    expect(ProjectOfficeCreate.safeParse({ ...base, projectType: "RESIDENTIAL" }).success).toBe(false);
  });
});

describe("LeadConvert validates projectType (lead → draft project)", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000001",
    projectTitle: "Converted lead",
    projectType: "Commercial Architecture",
    conflictCheckDone: true,
  };

  it("accepts a valid enum projectType", () => {
    expect(LeadConvert.safeParse(base).success).toBe(true);
  });

  it("rejects a free-text lead projectType so junk never lands on the project", () => {
    expect(LeadConvert.safeParse({ ...base, projectType: "shop" }).success).toBe(false);
  });
});

describe("Jurisdiction enum", () => {
  it("accepts the OTHER default and rejects junk", () => {
    expect(Jurisdiction.safeParse("OTHER").success).toBe(true);
    expect(Jurisdiction.safeParse("MARS").success).toBe(false);
  });
});
