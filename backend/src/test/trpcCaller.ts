import type { AuthUser } from "../auth/session.js";
import type { Context } from "../trpc/context.js";

export function testUser(role: AuthUser["role"], overrides: Partial<AuthUser> = {}): AuthUser {
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

export function testCtx(user: AuthUser | null, db: Context["db"]): Context {
  return {
    db,
    user,
    deviceSessionId: null,
    ip: "127.0.0.1",
    requestId: "test-request",
    setCookie: () => undefined,
  };
}

/** Placeholder — auth-only tests must not reach the database. */
export const noopDb = {} as Context["db"];
