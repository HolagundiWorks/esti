import { describe, expect, it, vi } from "vitest";
import {
  accessLevelForRole,
  minLevelForCapability,
} from "@esti/contracts";

// The licence write-gate reads org settings from the DB on every mutation.
// These boundary tests run against a stub context (`db: {}`), so pin the gate
// open — an unmanaged PRO install — and keep the tests purely about role gates.
vi.mock("../lib/plan.js", () => ({
  firmPlan: vi.fn(async () => "PRO"),
  licenseBlocked: vi.fn(async () => false),
}));
import type { AuthUser } from "../auth/session.js";
import type { Context } from "./context.js";
import {
  capabilityProcedure,
  clientProcedure,
  collaboratorProcedure,
  ownerProcedure,
  protectedProcedure,
  router,
} from "./trpc.js";

const authorizationRouter = router({
  read: protectedProcedure.query(() => true),
  write: protectedProcedure.mutation(() => true),
  invoice: capabilityProcedure("invoice:manage").mutation(() => true),
  fees: capabilityProcedure("fees:manage").query(() => true),
  owner: ownerProcedure.query(() => true),
  client: clientProcedure.query(({ ctx }) => ctx.user.clientId),
  collaborator: collaboratorProcedure.query(({ ctx }) => ctx.user.consultantId),
  users: router({ createStaff: protectedProcedure.mutation(() => true) }),
});

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

function caller(authUser: AuthUser | null) {
  return authorizationRouter.createCaller({
    db: {} as Context["db"],
    user: authUser,
    deviceSessionId: null,
    ip: "127.0.0.1",
    requestId: "test-request",
    sessionToken: undefined,
    platformAccountId: null,
    setCookie: () => undefined,
  });
}

describe("tRPC authorization boundaries", () => {
  it("requires authentication", async () => {
    await expect(caller(null).read()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(["OWNER", "PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"] as const)(
    "allows %s to read the staff workspace",
    async (role) => expect(caller(user(role)).read()).resolves.toBe(true),
  );

  it.each(["OWNER", "PARTNER", "SENIOR", "ASSOCIATE"] as const)(
    "allows %s operational mutations",
    async (role) => expect(caller(user(role)).write()).resolves.toBe(true),
  );

  it("keeps Viewer read-only", async () => {
    await expect(caller(user("VIEWER")).write()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(["CLIENT", "CONSULTANT"] as const)("rejects scoped %s accounts from staff procedures", async (role) => {
    const scoped = role === "CLIENT" ? { clientId: "00000000-0000-0000-0000-000000000002" } : { consultantId: "00000000-0000-0000-0000-000000000003" };
    await expect(caller(user(role, scoped)).read()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("preserves legacy internal consultant staff access", async () => {
    await expect(caller(user("CONSULTANT")).write()).resolves.toBe(true);
  });

  it.each([
    ["OWNER", true],
    ["PARTNER", true],
    // Invoices are financial instruments — partner and above (b6ad4c46).
    ["SENIOR", false],
    ["ASSOCIATE", false],
  ] as const)("enforces invoice capability for %s", async (role, allowed) => {
    const result = expect(caller(user(role)).invoice());
    if (allowed) await result.resolves.toBe(true);
    else await result.rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits firm administration to the owner", async () => {
    await expect(caller(user("OWNER")).owner()).resolves.toBe(true);
    await expect(caller(user("PARTNER")).owner()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits firm economics to partner and owner", async () => {
    await expect(caller(user("PARTNER")).fees()).resolves.toBe(true);
    await expect(caller(user("SENIOR")).fees()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces portal record scope", async () => {
    const clientId = "00000000-0000-0000-0000-000000000002";
    const consultantId = "00000000-0000-0000-0000-000000000003";
    await expect(caller(user("CLIENT", { clientId })).client()).resolves.toBe(clientId);
    await expect(caller(user("CONSULTANT", { consultantId })).collaborator()).resolves.toBe(consultantId);
    await expect(caller(user("CLIENT")).client()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(user("CONSULTANT")).collaborator()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks demo credential administration", async () => {
    await expect(caller(user("OWNER", { isDemo: true })).users.createStaff()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("maps staff roles to access levels L1–L5", () => {
    expect(accessLevelForRole("OWNER")).toBe(5);
    expect(accessLevelForRole("PARTNER")).toBe(4);
    expect(accessLevelForRole("SENIOR")).toBe(3);
    expect(accessLevelForRole("ASSOCIATE")).toBe(2);
    expect(accessLevelForRole("VIEWER")).toBe(1);
    expect(accessLevelForRole("CLIENT", { clientId: "c1" })).toBeNull();
  });

  it("aligns capability gates with documented minimum levels", () => {
    expect(minLevelForCapability("firm:admin")).toBe(5);
    expect(minLevelForCapability("reports:view")).toBe(4);
    // Financial instruments: partner and above (b6ad4c46).
    expect(minLevelForCapability("invoice:manage")).toBe(4);
    expect(minLevelForCapability("write")).toBe(2);
    expect(minLevelForCapability("workspace:view")).toBe(1);
  });

  it("rejects portal users from owner-only audit procedures", async () => {
    await expect(caller(user("PARTNER")).owner()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(user("OWNER")).owner()).resolves.toBe(true);
  });

  it("rejects cross-portal scope (client cannot use collaborator procedure)", async () => {
    const clientId = "00000000-0000-0000-0000-000000000002";
    await expect(
      caller(user("CLIENT", { clientId })).collaborator(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
