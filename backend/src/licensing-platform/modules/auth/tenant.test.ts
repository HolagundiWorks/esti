import { describe, expect, it } from "vitest";
import { resolveCompany } from "./tenant.js";

// The admin branch and empty-input guard resolve before any DB query, so these
// are safe to assert without a live database. They lock the security-sensitive
// rule that only the AORMS owner handle reaches the platform-admin login.
describe("resolveCompany — Step-1 admin branch", () => {
  it("routes the AORMS owner domain to the platform-admin login", async () => {
    expect((await resolveCompany("aorms.in")).mode).toBe("admin");
  });

  it("routes an @aorms.in email to admin", async () => {
    expect((await resolveCompany("team@aorms.in")).mode).toBe("admin");
    expect((await resolveCompany("  Team@AORMS.in ")).mode).toBe("admin");
  });

  it("treats blank input as not_found", async () => {
    expect((await resolveCompany("   ")).mode).toBe("not_found");
  });
});
