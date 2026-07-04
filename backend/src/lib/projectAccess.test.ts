import { describe, expect, it } from "vitest";
import type { DB } from "../db/index.js";
import { assertProjectAccess } from "./projectAccess.js";

/**
 * Stub DB for accessibleProjectIds' two reads on the non-Partner path:
 *  - teamMembers lookup ends in `.limit(1)` → we return no team member,
 *  - the createdById lookup awaits `.where(...)` → returns `createdRows`.
 * Partner+ roles short-circuit before any DB call, so the stub is unused there.
 */
function stubDb(createdRows: { id: string }[]): DB {
  const where = () => {
    const p: Promise<{ id: string }[]> & { limit?: () => Promise<never[]> } = Promise.resolve(createdRows);
    p.limit = async () => [];
    return p;
  };
  return { select: () => ({ from: () => ({ where }) }) } as unknown as DB;
}

const PID = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";

describe("assertProjectAccess", () => {
  it("lets a Partner+ (project:delete) reach any project", async () => {
    // OWNER short-circuits to see-all — the empty stub is never touched.
    await expect(assertProjectAccess({} as DB, { id: "u1", role: "OWNER" }, PID)).resolves.toBeUndefined();
  });

  it("allows a non-Partner to reach a project they created", async () => {
    await expect(
      assertProjectAccess(stubDb([{ id: PID }]), { id: "u2", role: "SENIOR" }, PID),
    ).resolves.toBeUndefined();
  });

  it("blocks a non-Partner from a project they neither created nor are assigned to", async () => {
    await expect(
      assertProjectAccess(stubDb([{ id: OTHER }]), { id: "u2", role: "SENIOR" }, PID),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
