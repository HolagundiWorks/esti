import { validateBbsSchedule, type BbsItemLike } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { bbsItems } from "../db/schema.js";

export async function loadBbsItems(db: DB, bbsId: string): Promise<BbsItemLike[]> {
  const rows = await db
    .select()
    .from(bbsItems)
    .where(eq(bbsItems.bbsId, bbsId))
    .orderBy(asc(bbsItems.createdAt));

  return rows.map((r) => ({
    barMark: r.barMark,
    member: r.member,
    diaMm: r.diaMm,
    noOfMembers: r.noOfMembers,
    barsPerMember: r.barsPerMember,
    cuttingLengthMm: r.cuttingLengthMm,
    weightKg: r.weightKg,
  }));
}

/** Run engineering validation; throws BAD_REQUEST when export/issue is blocked. */
export async function requireValidBbsSchedule(db: DB, bbsId: string) {
  const items = await loadBbsItems(db, bbsId);
  const result = validateBbsSchedule(items);
  if (!result.ok) {
    const first = result.issues.find((i) => i.severity === "error");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: first?.message ?? "BBS validation failed",
    });
  }
  return result;
}
