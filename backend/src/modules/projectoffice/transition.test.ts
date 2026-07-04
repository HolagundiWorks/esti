import { describe, expect, it } from "vitest";
import type { DB } from "../../db/index.js";
import { assertLegalTransition } from "./router.js";

const PID = "00000000-0000-0000-0000-000000000001";

/** Stub DB for the ENQUIRY→PROPOSAL DNA lookup. `dna` = the rows the select
 *  resolves to (empty array = no DNA captured). No other transition touches it. */
function db(dna: unknown[] = []): DB {
  return {
    select: () => ({ from: () => ({ where: async () => dna }) }),
  } as unknown as DB;
}

describe("assertLegalTransition — project status state machine", () => {
  it("allows a no-op (same status)", async () => {
    await expect(assertLegalTransition(db(), PID, "ACTIVE", "ACTIVE")).resolves.toBeUndefined();
  });

  it("blocks INITIAL activation — activation runs through the gate, not a manual status change", async () => {
    await expect(assertLegalTransition(db(), PID, "PROPOSAL", "ACTIVE")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(assertLegalTransition(db(), PID, "ENQUIRY", "ACTIVE")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("allows resuming a paused project (ON_HOLD → ACTIVE) — it was gated already", async () => {
    await expect(assertLegalTransition(db(), PID, "ON_HOLD", "ACTIVE")).resolves.toBeUndefined();
  });

  it("allows legal graph moves", async () => {
    await expect(assertLegalTransition(db(), PID, "ACTIVE", "ON_HOLD")).resolves.toBeUndefined();
    await expect(assertLegalTransition(db(), PID, "ACTIVE", "COMPLETED")).resolves.toBeUndefined();
    await expect(assertLegalTransition(db(), PID, "PROPOSAL", "CANCELLED")).resolves.toBeUndefined();
    await expect(assertLegalTransition(db(), PID, "CANCELLED", "ENQUIRY")).resolves.toBeUndefined();
  });

  it("blocks illegal moves and terminal-state exits", async () => {
    await expect(assertLegalTransition(db(), PID, "COMPLETED", "ACTIVE")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(assertLegalTransition(db(), PID, "ENQUIRY", "COMPLETED")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("requires a captured Project DNA for ENQUIRY → PROPOSAL", async () => {
    await expect(assertLegalTransition(db([]), PID, "ENQUIRY", "PROPOSAL")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("DNA"),
    });
    await expect(
      assertLegalTransition(db([{ id: "dna-1" }]), PID, "ENQUIRY", "PROPOSAL"),
    ).resolves.toBeUndefined();
  });
});
