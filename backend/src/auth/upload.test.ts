import { describe, expect, it } from "vitest";
import type { AuthUser } from "./session.js";
import { uploadDenial } from "./upload.js";

function user(role: AuthUser["role"], overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "user@example.in",
    fullName: "Test User",
    role,
    clientId: null,
    consultantId: null,
    isDemo: false,
    ...overrides,
  };
}

describe("uploadDenial", () => {
  it("requires authentication", () => {
    expect(uploadDenial(null)).toEqual({ status: 401, error: "unauthenticated" });
  });

  it.each(["CLIENT", "VIEWER"] as const)(
    "blocks %s from operational uploads",
    (role) => expect(uploadDenial(user(role))).toEqual({ status: 403, error: "insufficient permission" }),
  );

  it("blocks a project-scoped consultant portal account", () => {
    expect(
      uploadDenial(
        user("CONSULTANT", { consultantId: "00000000-0000-0000-0000-000000000002" }),
      ),
    ).toEqual({ status: 403, error: "insufficient permission" });
  });

  it("allows a legacy internal consultant account", () => {
    expect(uploadDenial(user("CONSULTANT"))).toBeNull();
  });

  it("blocks demo users even when their role can write", () => {
    expect(uploadDenial(user("OWNER", { isDemo: true }))).toEqual({
      status: 403,
      error: "uploads are disabled on the demo account",
    });
  });

  it.each(["OWNER", "PARTNER", "SENIOR", "ASSOCIATE"] as const)(
    "allows %s to perform operational uploads",
    (role) => expect(uploadDenial(user(role))).toBeNull(),
  );

  it("requires owner capability for firm assets", () => {
    expect(uploadDenial(user("PARTNER"), "firm:admin")).toEqual({
      status: 403,
      error: "insufficient permission",
    });
    expect(uploadDenial(user("OWNER"), "firm:admin")).toBeNull();
  });
});
